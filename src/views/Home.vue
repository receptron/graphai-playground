<template>
  <div class="home">
    <div>
      <div class="w-10/12 mx-auto rounded-md mt-4">
        <div class="flex">
          <div class="w-8/12">
            <!-- textarea -->
            <textarea
              v-model="graphText"
              :rows="graphText.split('\n').length + 5"
              class="p-2 w-full rounded-md border-2 resize-y focus:outline-none"
              :class="isValudGraph ? '' : 'border-red-500'"
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
              <b>Agents:</b>
              <div v-for="(agent, key) in agentKeys" :key="key" @click="addAgentToGraph(agent)" class="cursor-pointer">
                {{ agent }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="w-10/12 mx-auto rounded-md border-2 mt-4">
        <div class="h-full">
          <div class="p-2">
            <!-- run button -->
            <div>
              <button class="text-white font-bold items-center rounded-full px-4 py-2 m-1 bg-sky-500 hover:bg-sky-700" @click="agentServer">Run</button>
            </div>
          </div>

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
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from "vue";

import { GraphAI, AgentFunctionContext } from "graphai";

import * as agents from "@graphai/vanilla";

import { sleeperAgent } from "@graphai/sleeper_agents";
import { streamAgentFilterGenerator, httpAgentFilter } from "@graphai/agent_filters";

import { graphDataSet } from "@/utils/graph_data";

import { useCytoscape } from "@receptron/graphai_vue_cytoscape";

import TextAreaView from "@/components/TextAreaView.vue";

import { saveGraphToLocalStorage, loadLocalStorageList, loadLocalStorage } from "./localStorage";

import YAML from "yaml";

const serverAgentIds = ["groqAgent", "slashGPTAgent", "openAIAgent", "fetchAgent", "wikipediaAgent"];
const streamAgents = ["groqAgent", "slashGPTAgent", "openAIAgent", "streamMockAgent"];

const useAgentFilter = (callback: (context: AgentFunctionContext, data: T) => void) => {
  const streamAgentFilter = streamAgentFilterGenerator(callback);

  const agentFilters = [
    {
      name: "streamAgentFilter",
      agent: streamAgentFilter,
      agentIds: streamAgents,
    },
    {
      name: "httpAgentFilter",
      agent: httpAgentFilter,
      filterParams: {
        server: {
          baseUrl: "http://localhost:8085/agents",
        },
      },
      agentIds: serverAgentIds,
    },
  ];
  return agentFilters;
};

const useGraphInput = () => {
  const graphText = ref("");
  const graphData = computed(() => {
    try {
      return YAML.parse(graphText.value);
    } catch (e) {
      return null;
    }
  });
  const isValudGraph = computed(() => {
    return graphData.value !== null;
  });
  const nodes = computed(() => {
    return graphData.value?.nodes || {};
  });
  const addAgent = (agentId: string, nodeId: string) => {
    const tmp = { ...graphData.value };
    tmp.nodes[nodeId] = {
      agent: agentId,
      inputs: [],
    };
    graphText.value = YAML.stringify(tmp, null, 2);
  };
  return { graphText, graphData, isValudGraph, nodes, addAgent };
};

const getServerAgents = async () => {
  const response = await fetch("http://localhost:8085/agents/list");
  return await response.json();
};

export default defineComponent({
  name: "HomePage",
  components: {
    TextAreaView,
  },
  setup() {
    const { graphText, graphData, isValudGraph, nodes, addAgent } = useGraphInput();

    const selectedGraphIndex = ref(0);
    const selectedGraph = computed(() => {
      return graphDataSet[selectedGraphIndex.value].data;
    });

    const currentName = ref("");
    const selectedLocalGraphIndex = ref(0);
    const localStorageList = ref(loadLocalStorageList());
    const selectedLocalName = computed(() => {
      return localStorageList.value[selectedLocalGraphIndex.value];
    });

    const streamingData = ref<Record<string, unknown>>({});
    const result = ref<unknown>({});

    (async () => {
      const res = await getServerAgents();
      console.log(res);
    })();

    const callback = (context: AgentFunctionContext, data: string) => {
      const { nodeId } = context.debugInfo;
      streamingData.value[nodeId] = (streamingData.value[nodeId] ?? "") + data;
    };
    const agentFilters = useAgentFilter(callback);

    const { updateCytoscape, cytoscapeRef } = useCytoscape(graphData);

    const runGraph = async () => {
      if (!isValudGraph.value) {
        return;
      }
      result.value = {};
      streamingData.value = {};

      const graphai = new GraphAI(graphData.value, { ...agents, sleeperAgent }, { agentFilters, bypassAgentIds: serverAgentIds });
      graphai.onLogCallback = (log) => {
        const isServer = serverAgentIds.includes(log.agentId);
        updateCytoscape(log.nodeId, log.state === "executing" && isServer ? "executing-server" : log.state);
      };
      result.value = await graphai.run();
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
    };
    const loadLocal = () => {
      graphText.value = loadLocalStorage(selectedLocalName.value) ?? "";
      currentName.value = selectedLocalName.value;
    };

    const agentKeys = computed(() => {
      return [...serverAgentIds, ...Object.keys(agents)];
    });
    const addAgentToGraph = (agentId: string) => {
      if (isValudGraph.value) {
        console.log(agentId);
        const nodeId = prompt("NodeId");
        addAgent(agentId, nodeId);
      }
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
      agentKeys,
      addAgentToGraph,

      isValudGraph,

      // local storage
      save,
      localStorageList,
      selectedLocalGraphIndex,
      loadLocal,

      cytoscapeRef,
    };
  },
});
</script>
