const localStoragePrefix = "graphai-playground";
const localStorageListKey = localStoragePrefix + "-list";

export const loadLocalStorageList = () => {
  try {
    const listString = localStorage.getItem(localStorageListKey) ?? "[]";
    return JSON.parse(listString);
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
};

export const loadLocalStorage = (name: string) => {
  const graphKey = localStoragePrefix + "-graph-" + name;
  return localStorage.getItem(graphKey);
};
