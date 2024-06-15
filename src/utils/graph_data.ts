const graph_data1 = {
  version: 0.5,
  nodes: {
    node1: {
      value: "test",
    },
    node2: {
      agent: "copyAgent",
      inputs: [":node1"],
    },
  },
};

const graph_data2 = {
  version: 0.3,
  nodes: {
    query: {
      agent: "streamMockAgent",
      params: {
        isStreaming: true,
        message: "this is from the server",
      },
    },
    answer: {
      agent: "sleeperAgent",
      inputs: [":query"],
      isResult: true,
    },
  },
};

const graph_data3 = {
  version: 0.3,
  nodes: {
    node1: {
      value: "Please tell me about photosynthesis in 50 words.",
    },
    node2: {
      agent: "openAIAgent",
      params: {
        stream: true,
      },
      inputs: { prompt: ":node1" },
      isResult: true,
    },
  },
};

const graph_data4 = {
  version: 0.3,
  nodes: {
    input: {
      value: "Steve Wozniak",
    },
    wikipedia: {
      inputs: [":input"],
      agent: "wikipediaAgent",
      isResult: true,
      params: {
        lang: "ja",
      },
    },
  },
};

export const graphDataSet = [
  {
    data: graph_data1,
    name: "template",
  },
  {
    data: graph_data2,
    name: "stream mock",
  },
  {
    data: graph_data3,
    name: "openai",
  },
  {
    data: graph_data4,
    name: "wikipedia",
  },
];
