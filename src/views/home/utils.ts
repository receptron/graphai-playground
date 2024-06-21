import { ref, computed } from "vue";
import YAML from "yaml";

import { AgentFunctionContext } from "graphai";

import { graphDataSet } from "@/utils/graph_data";
import { streamAgentFilterGenerator, httpAgentFilter } from "@graphai/agent_filters";
import { ExpressAgentInfo } from "@receptron/graphai_express_type";

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
  serverAgentUrlDictionary: Record<string, string>,
  serverAgentIds: string[],
  streamAgentIds: string[],
  callback: (context: AgentFunctionContext, data: T) => void,
) => {
  console.log(serverAgentUrlDictionary);
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
          serverAgentUrlDictionary,
        },
      },
      agentIds: serverAgentIds,
    },
  ];
  return agentFilters;
};

export const useServerAgent = (agentBaseUrls: string[]) => {
  const serverAgentUrlDictionary: Record<string, string> = {};
  const getServerAgents = async (url: string) => {
    const response = await fetch(url);
    return await response.json();
  };

  const serverAgentsInfoDictionary = ref<Record<string, ExpressAgentInfo>>({});

  agentBaseUrls.forEach(async (url) => {
    const res = await getServerAgents(url);
    serverAgentsInfoDictionary.value = res.agents.reduce((tmp: Record<string, ExpressAgentInfo>, a: ExpressAgentInfo) => {
      if (tmp[a.agentId]) {
        console.log("duplicate agent: " + a.agentId);
      }
      serverAgentUrlDictionary[a.agentId] = url + "/" + a.agentId;
      tmp[a.agentId] = a;
      return tmp;
    }, {});
  });

  const serverAgentIds = computed(() => {
    return (
      Object.keys(serverAgentsInfoDictionary.value).map((key: string) => {
        return serverAgentsInfoDictionary.value[key].agentId;
      }) ?? []
    );
  });
  return { serverAgentsInfoDictionary, serverAgentIds, serverAgentUrlDictionary };
};

export const useStreamingData = () => {
  const streamingData = ref<Record<string, unknown>>({});
  const callback = (context: AgentFunctionContext, data: string) => {
    const { nodeId } = context.debugInfo;
    streamingData.value[nodeId] = (streamingData.value[nodeId] ?? "") + data;
  };
  return { streamingData, callback };
};
