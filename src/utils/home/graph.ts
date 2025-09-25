import { ref, computed } from "vue";
import { AgentFunctionContext, GraphAI, GraphData, AgentFunctionInfoDictionary } from "graphai";

import { streamAgentFilterGenerator } from "@graphai/stream_agent_filter";
import { httpAgentFilter } from "@graphai/http_client_agent_filter";

import { ExpressAgentInfo } from "@receptron/graphai_express_type";

const getAgentFilter = <T>(
  serverAgentUrlDictionary: Record<string, string>,
  serverAgentIds: string[],
  streamAgentIds: string[],
  callback: (context: AgentFunctionContext, data: T) => void,
) => {
  const streamAgentFilter = streamAgentFilterGenerator(callback);
  return [
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
};

const useServerAgent = (agentBaseUrls: string[]) => {
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

const useStreamingData = () => {
  const streamingData = ref<Record<string, unknown>>({});
  const callback = (context: AgentFunctionContext, data: string) => {
    const { nodeId } = context.debugInfo;
    streamingData.value[nodeId] = (streamingData.value[nodeId] ?? "") + data;
  };
  return { streamingData, callback };
};

export const useGraph = (agentUrls: string[], clientAgents: AgentFunctionInfoDictionary) => {
  const graphResult = ref<Record<string, unknown>>({});

  const { serverAgentsInfoDictionary, serverAgentIds, serverAgentUrlDictionary } = useServerAgent(agentUrls);

  const streamAgentIds = computed(() => {
    return [
      ...Object.values(serverAgentsInfoDictionary.value)
        .filter((a) => a.stream)
        .map((a) => a.agentId),
      ...Object.values(clientAgents)
        .filter((a) => a.stream)
        .map((a) => a.name),
    ];
  });

  const { streamingData, callback } = useStreamingData();
  const getGraph = (graphData: GraphData) => {
    const agentFilters = getAgentFilter(serverAgentUrlDictionary, serverAgentIds.value, streamAgentIds.value, callback);
    graphResult.value = {};
    streamingData.value = {};
    return new GraphAI(graphData, clientAgents, { agentFilters, bypassAgentIds: serverAgentIds.value });
  };

  return {
    getGraph,
    streamingData,
    graphResult,
    serverAgentIds,
    serverAgentsInfoDictionary,
  };
};
