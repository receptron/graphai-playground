<template>
  <div class="home">
    <div>
      <div class="w-10/12 mx-auto rounded-md mt-4">
        <div class="flex">
          <div class="w-8/12 border-2" :class="isValudGraph ? '' : 'border-red-500'">
            <!-- textarea -->
            <v-ace-editor
              class="h-full"
              v-model:value="graphText"
              lang="yaml"
              theme="chrome"
              @init="editorInit"
            />
          </div>
          <div class="w-4/12 text-left p-2">
            <div>
              Preset:
              <select v-model="selectedGraphIndex" class="border rounded-md p-2">
                <option v-for="(option, index) in graphDataSet" :value="index" :key="index">
                  {{ option.name }}
                </option>
              </select>
              <button @click="load" class="border-2 rounded-md ml-2 p-2">load</button>
            </div>
            <div v-if="localStorageList.length > 0">
              You:
              <select v-model="selectedLocalGraphIndex" class="border rounded-md p-2">
                <option v-for="(option, index) in localStorageList" :value="index" :key="index">
                  {{ option }}
                </option>
              </select>
              <button @click="loadLocal" class="border-2 rounded-md ml-2 p-2">load</button>
            </div>
            <div>
              <button @click="save" class="border-2 rounded-md m-2 p-2">save</button>
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
                <span @click="addAgentToGraph(agent)" class="cursor-pointer">
                  {{ agent }}
                </span>
                <span @click="infoServerAgent(agent)" class="cursor-pointer"> (i) </span>
              </div>
              <b>WebAgents:</b>
              <div v-for="(agent, key) in webAgentIds" :key="key">
                <span @click="addAgentToGraph(agent)" class="cursor-pointer">
                  {{ agent }}
                </span>
                <span @click="infoWebAgent(agent)" class="cursor-pointer"> (i) </span>
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
                <TextAreaView :data-object="result" />
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

import { GraphAI } from "graphai";

import * as webAgents from "@graphai/vanilla";
import { sleeperAgent } from "@graphai/sleeper_agents";
import { useCytoscape } from "@receptron/graphai_vue_cytoscape";

import TextAreaView from "@/components/TextAreaView.vue";

import { saveGraphToLocalStorage, loadLocalStorageList, loadLocalStorage } from "./home/localStorage";
import { useSelectGraph, useGraphInput, getAgentFilter, useServerAgent, useStreamingData } from "./home/utils";

import YAML from "yaml";

import VAceEditor from "../utils/ace/index.vue";
import modeYaml from "ace-builds/src-noconflict/mode-yaml?url";
import chromeTheme from "ace-builds/src-noconflict/theme-chrome?url";
import Ace, { config } from "ace-builds";

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

    const result = ref<unknown>({});

    const { serverAgentsInfoDictionary, serverAgentIds } = useServerAgent("http://localhost:8085/agents/list");

    const webAgentIds = computed(() => {
      return Object.keys(webAgents);
    });
    const streamAgentIds = computed(() => {
      return [
        ...Object.values(serverAgentsInfoDictionary.value)
          .filter((a) => a.stream)
          .map((a) => a.agentId),
        ...Object.values(webAgents)
          .filter((a) => a.stream)
          .map((a) => a.name),
      ];
    });

    const { updateCytoscape, cytoscapeRef } = useCytoscape(graphData);
    const { streamingData, callback } = useStreamingData();

    const errorLog = ref("");
    const graphLog = ref<string[]>([]);
    const runGraph = async () => {
      const httpAgentUrl = "http://localhost:8085/agents";
      const agentFilters = getAgentFilter(httpAgentUrl, serverAgentIds.value, streamAgentIds.value, callback);
      if (!isValudGraph.value) {
        return;
      }
      result.value = {};
      streamingData.value = {};

      try {
        const graphai = new GraphAI(graphData.value, { ...webAgents, sleeperAgent }, { agentFilters, bypassAgentIds: serverAgentIds.value });
        graphai.onLogCallback = (log) => {
          const { agentId, startTime, endTime, nodeId, state, inputs, inputsData, isLoop, result, errorMessage } = log;

          graphLog.value.push(JSON.stringify({ agentId, startTime, endTime, nodeId, state, inputs, inputsData, isLoop, result, errorMessage }));
          //console.log(log)
          const isServer = serverAgentIds.value.includes(log.agentId);
          updateCytoscape(log.nodeId, log.state === "executing" && isServer ? "executing-server" : log.state);
        };
        result.value = await graphai.run();
      } catch (e) {
        errorLog.value = e;
      }
    };

    const save = () => {
      currentName.value = saveGraphToLocalStorage(graphText.value, currentName.value);
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
      console.log(webAgents[agentId]);
    };
    const infoServerAgent = (agentId: string) => {
      console.log(serverAgentsInfoDictionary.value);
      console.log(serverAgentsInfoDictionary.value[agentId]);
    };
    return {
      agentServer,
      runGraph,

      streamingData,
      result,

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
