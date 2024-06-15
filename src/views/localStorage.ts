const localStoragePrefix = "graphai-playground";
const localStorageListKey = localStoragePrefix + "-list";

export const loadLocalStorageList = () => {
  try {
    const listString = localStorage.getItem(localStorageListKey) ?? "[]";
    console.log(listString);
    const listData = JSON.parse(listString);
    console.log(listData);
    return listData;
  } catch (e) {
    console.log(e);
    return [];
  }
};

export const saveGraphToLocalStorage = (graphText: string, currentName: string) => {
  const name = prompt("保存するGraphDataの名前(英数字)", currentName);
  const listData = loadLocalStorageList();
  if (!listData.includes(name) && name) {
    listData.push(name);
    localStorage.setItem(localStorageListKey, JSON.stringify(listData));
  }
  const graphKey = localStoragePrefix + "-graph-" + name;
  localStorage.setItem(graphKey, graphText);

  return name;
  // console.log(hoge);
};

export const loadLocalStorage = (name: string) => {
  const graphKey = localStoragePrefix + "-graph-" + name;
  console.log(graphKey);
  const graphString = localStorage.getItem(graphKey);
  return graphString;
};
