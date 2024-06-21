import { ref, computed } from "vue";
import YAML from "yaml";

import { graphDataSet } from "@/utils/graph_data";

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
