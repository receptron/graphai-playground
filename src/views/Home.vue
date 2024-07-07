<template>
  <div class="home">
    <div>
      <div class="w-10/12 mx-auto rounded-md mt-4">
        <div class="flex">
          <div class="w-8/12 border-2" :class="isValudGraph ? '' : 'border-red-500'">
            <!-- textarea -->
            <v-ace-editor v-model:value="graphText" class="h-full" lang="yaml" theme="chrome" @init="editorInit" />
          </div>
          <div class="w-4/12 text-left p-2">
            <div>
              Preset:
              <select v-model="selectedGraphIndex" class="border rounded-md p-2">
                <option v-for="(option, index) in graphDataSet" :key="index" :value="index">
                  {{ option.name }}
                </option>
              </select>
              <button class="border-2 rounded-md ml-2 p-2" @click="load">load</button>
            </div>
            <div v-if="localStorageList.length > 0">
              You:
              <select v-model="selectedLocalGraphIndex" class="border rounded-md p-2">
                <option v-for="(option, index) in localStorageList" :key="index" :value="index">
                  {{ option }}
                </option>
              </select>
              <button class="border-2 rounded-md ml-2 p-2" @click="loadLocal">load</button>
            </div>
            <div>
              <button class="border-2 rounded-md m-2 p-2" @click="save">save</button>
            </div>
            <div>
              <b>Nodes:</b>
              <div v-for="(nodeId, key) in Object.keys(nodes)" :key="key">
                {{ nodeId }}
              </div>
            </div>
            <div>
              <b>ServerAgents:</b>
              <div v-for="(agent, key) in serverAgentIds" :key="key">
                <span class="cursor-pointer" @click="addAgentToGraph(agent)">
                  {{ agent }}
                </span>
                <span class="cursor-pointer" @click="infoServerAgent(agent)"> (i) </span>
              </div>
              <b>WebAgents:</b>
              <div v-for="(agent, key) in webAgentIds" :key="key">
                <span class="cursor-pointer" @click="addAgentToGraph(agent)">
                  {{ agent }}
                </span>
                <span class="cursor-pointer" @click="infoWebAgent(agent)"> (i) </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="w-10/12 mx-auto rounded-md border-2 mt-4">
        <div class="p-2">
          <!-- run button -->
          <div>
            <button class="w-60 text-white font-bold items-center rounded-full px-4 py-2 m-1 bg-sky-500 hover:bg-sky-700" @click="agentServer">Run</button>
          </div>
        </div>
      </div>

      <div class="w-10/12 mx-auto rounded-md border-2 mt-4">
        <div class="h-full">
          <!-- cytoscape -->
          <div>
            <div class="h-60 bg-white align-top m-2">
              <div ref="cytoscapeRef" class="w-full h-full" />
            </div>
          </div>
          <div class="flex h-full">
            <!-- log -->
            <div class="w-1/2 break-words whitespace-pre-wrap">
              Streaming<br />
              <TextAreaView :data-object="streamingData" />
            </div>
            <div class="w-1/2">
              Result<br />
              <div class="text-left p-4">
                <TextAreaView :data-object="graphResult" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="w-10/12 mx-auto rounded-md border-2 mt-4">
        ErrorLog
        <div class="break-words">{{ errorLog }}</div>
      </div>

      <div class="w-10/12 mx-auto rounded-md border-2 mt-4">
        GraphLog
        <div v-for="(log, key) in graphLog" :key="key" class="text-left break-words">
          {{ log }}
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from "vue";

import { AgentFunctionInfoDictionary, NodeState } from "graphai";

import * as webAgents from "@graphai/vanilla";
import * as sleeperAgents from "@graphai/sleeper_agents";
import { useCytoscape } from "@receptron/graphai_vue_cytoscape";

import TextAreaView from "@/components/TextAreaView.vue";
import VAceEditor from "@/components/ace.vue";

import { saveGraphToLocalStorage, loadLocalStorageList, loadLocalStorage } from "../utils/home/localStorage";
import { useSelectGraph, useGraphInput } from "../utils/home/utils";
import { useGraph } from "../utils/home/graph";

import YAML from "yaml";

import modeYaml from "ace-builds/src-noconflict/mode-yaml?url";
import chromeTheme from "ace-builds/src-noconflict/theme-chrome?url";
import { Ace, config } from "ace-builds";

config.setModuleUrl("ace/mode/yaml", modeYaml);
config.setModuleUrl("ace/theme/chrome", chromeTheme);

export default defineComponent({
  name: "HomePage",
  components: {
    TextAreaView,
    VAceEditor,
  },
  setup() {
    const editor = ref<Ace.Editor>();
    const editorInit = (e: Ace.Editor) => {
      editor.value = e;
    };

    const { graphText, graphData, isValudGraph, nodes, addAgent } = useGraphInput();
    const { selectedGraphIndex, selectedGraph, graphDataSet } = useSelectGraph();

    const currentName = ref("");
    const selectedLocalGraphIndex = ref(0);
    const localStorageList = ref(loadLocalStorageList());
    const selectedLocalName = computed(() => {
      return localStorageList.value[selectedLocalGraphIndex.value];
    });

    const { updateCytoscape, cytoscapeRef } = useCytoscape(graphData);

    const httpAgentUrl = "http://localhost:8085/agents";
    const { getGraph, streamingData, graphResult, serverAgentIds, serverAgentsInfoDictionary } = useGraph([httpAgentUrl], { ...webAgents, ...sleeperAgents });

    const errorLog = ref("");
    const graphLog = ref<string[]>([]);
    const runGraph = async () => {
      if (!isValudGraph.value) {
        return;
      }

      try {
        const graphai = getGraph(graphData.value);
        graphai.onLogCallback = (log) => {
          const { agentId, startTime, endTime, nodeId, state, inputs, inputsData, isLoop, result, errorMessage } = log;
          graphLog.value.push(JSON.stringify({ agentId, startTime, endTime, nodeId, state, inputs, inputsData, isLoop, result, errorMessage }));
          console.log(log);
          const isServer = serverAgentIds.value.includes(log.agentId || "");
          updateCytoscape(log.nodeId, log.state === "executing" && isServer ? NodeState.ExecutingServer : log.state);
        };
        graphResult.value = await graphai.run();
      } catch (e) {
        errorLog.value = e as string;
      }
    };

    const save = () => {
      currentName.value = saveGraphToLocalStorage(graphText.value, currentName.value) || "";
      localStorageList.value = loadLocalStorageList();
    };

    const agentServer = async () => {
      runGraph();
    };

    const load = () => {
      graphText.value = YAML.stringify({ ...selectedGraph.value }, null, 2);
      // editor.value.getSession().setValue(graphText.value);
    };
    const loadLocal = () => {
      graphText.value = loadLocalStorage(selectedLocalName.value) ?? "";
      currentName.value = selectedLocalName.value;
    };

    const addAgentToGraph = (agentId: string) => {
      if (isValudGraph.value) {
        const nodeId = prompt("NodeId");
        if (nodeId) {
          addAgent(agentId, nodeId);
        }
      }
    };
    const infoWebAgent = (agentId: string) => {
      const agents: AgentFunctionInfoDictionary = webAgents;
      console.log(agents[agentId]);
    };
    const infoServerAgent = (agentId: string) => {
      console.log(serverAgentsInfoDictionary.value);
      console.log(serverAgentsInfoDictionary.value[agentId]);
    };
    const webAgentIds = computed(() => {
      return Object.keys(webAgents);
    });

    return {
      agentServer,
      runGraph,

      streamingData,
      graphResult,

      graphDataSet,
      selectedGraphIndex,

      graphText,
      load,

      nodes,
      addAgentToGraph,
      infoWebAgent,
      infoServerAgent,

      webAgentIds,
      serverAgentIds,

      isValudGraph,

      // local storage
      save,
      localStorageList,
      selectedLocalGraphIndex,
      loadLocal,

      errorLog,
      graphLog,

      cytoscapeRef,

      editorInit,
    };
  },
});
</script>
