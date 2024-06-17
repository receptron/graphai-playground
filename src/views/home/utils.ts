import { ref, computed } from "vue";
import YAML from "yaml";

import { AgentFunctionContext } from "graphai";

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

export const getAgentFilter = <T>(
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
      agentIds: streamAgentIds,
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

// TODO: from express
type ExpressAgentInfo = {
  agentId: string;
  name: string;
  url: string;
  description: string;
  category: string[];
  author: string;
  license: string;
  repository: string;
  samples: any; // TODO: AgentFunctionInfoSample from graph
  inputs: any;
  output: any;
  stream: boolean;
};

export const useServerAgent = (listUrl: string) => {
  const getServerAgents = async () => {
    const response = await fetch(listUrl);
    return await response.json();
  };

  const serverAgentsInfoDictionary = ref<Record<string, ExpressAgentInfo>>({});

  (async () => {
    const res = await getServerAgents();
    serverAgentsInfoDictionary.value = res.agents.reduce((tmp: Record<string, ExpressAgentInfo>, a: ExpressAgentInfo) => {
      tmp[a.agentId] = a;
      return tmp;
    }, {});
  })();

  const serverAgentIds = computed(() => {
    return (
      Object.keys(serverAgentsInfoDictionary.value).map((key: string) => {
        return serverAgentsInfoDictionary.value[key].agentId;
      }) ?? []
    );
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
