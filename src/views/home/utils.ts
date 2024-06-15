import { ref, computed } from "vue";
import YAML from "yaml";

import { graphDataSet } from "@/utils/graph_data";
import { streamAgentFilterGenerator, httpAgentFilter } from "@graphai/agent_filters";

export const useSelectGraph = () => {
  const selectedGraphIndex = ref(0);
  const selectedGraph = computed(() => {
    return graphDataSet[selectedGraphIndex.value].data;
  });
  return { selectedGraphIndex, selectedGraph, graphDataSet };
};

export const useGraphInput = () => {
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

export const getAgentFilter = (
  httpAgentUrl: string,
  serverAgentIds: string[],
  streamAgentIds: string[],
  callback: (context: AgentFunctionContext, data: T) => void,
) => {
  const streamAgentFilter = streamAgentFilterGenerator(callback);
  const agentFilters = [
    {
      name: "streamAgentFilter",
      agent: streamAgentFilter,
      agentIds: serverAgentIds,
    },
    {
      name: "httpAgentFilter",
      agent: httpAgentFilter,
      filterParams: {
        server: {
          baseUrl: httpAgentUrl,
        },
      },
      agentIds: serverAgentIds,
    },
  ];
  return agentFilters;
};

export const useServerAgent = (listUrl: string) => {
  const getServerAgents = async () => {
    const response = await fetch(listUrl);
    return await response.json();
  };

  const serverAgentsInfoDictionary = ref({});

  (async () => {
    const res = await getServerAgents();
    serverAgentsInfoDictionary.value = res.agents.reduce((tmp, a) => {
      tmp[a.agentId] = a;
      return tmp;
    }, {});
  })();

  const serverAgentIds = computed(() => {
    return Object.values(serverAgentsInfoDictionary.value).map((a) => a.agentId) ?? [];
  });
  return { serverAgentsInfoDictionary, serverAgentIds };
};

export const useStreamingData = () => {
  const streamingData = ref<Record<string, unknown>>({});
  const callback = (context: AgentFunctionContext, data: string) => {
    const { nodeId } = context.debugInfo;
    streamingData.value[nodeId] = (streamingData.value[nodeId] ?? "") + data;
  };
  return { streamingData, callback };
};
