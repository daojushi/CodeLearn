import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type Api } from '../shared/types'

const api: Api = {
  ping: () => ipcRenderer.invoke(IPC.ping),

  problemsList: () => ipcRenderer.invoke(IPC.problemsList),
  problemGet: (id) => ipcRenderer.invoke(IPC.problemsGet, id),
  problemCreate: (draft) => ipcRenderer.invoke(IPC.problemsCreate, draft),
  problemUpdate: (id, patch) => ipcRenderer.invoke(IPC.problemsUpdate, id, patch),
  problemRemove: (id) => ipcRenderer.invoke(IPC.problemsRemove, id),
  problemAddBlock: (id, draft) => ipcRenderer.invoke(IPC.problemsAddBlock, id, draft),
  problemDeleteBlock: (blockId) => ipcRenderer.invoke(IPC.problemsDeleteBlock, blockId),
  problemAddKnowledge: (problemId, kpId) =>
    ipcRenderer.invoke(IPC.problemsAddKnowledge, problemId, kpId),
  problemRemoveKnowledge: (problemId, kpId) =>
    ipcRenderer.invoke(IPC.problemsRemoveKnowledge, problemId, kpId),
  problemAddMistake: (problemId, presetId) =>
    ipcRenderer.invoke(IPC.problemsAddMistake, problemId, presetId),
  problemRemoveMistake: (problemId, presetId) =>
    ipcRenderer.invoke(IPC.problemsRemoveMistake, problemId, presetId),

  knowledgeListAll: () => ipcRenderer.invoke(IPC.knowledgeListAll),
  knowledgeGet: (id) => ipcRenderer.invoke(IPC.knowledgeGet, id),
  knowledgeGetOrCreate: (name) => ipcRenderer.invoke(IPC.knowledgeGetOrCreate, name),
  knowledgeRename: (id, name) => ipcRenderer.invoke(IPC.knowledgeRename, id, name),
  knowledgeRemove: (id) => ipcRenderer.invoke(IPC.knowledgeRemove, id),
  knowledgeUpdate: (id, patch) => ipcRenderer.invoke(IPC.knowledgeUpdate, id, patch),

  mistakePresetsList: () => ipcRenderer.invoke(IPC.presetsMistakeList),
  mistakePresetAdd: (name) => ipcRenderer.invoke(IPC.presetsMistakeAdd, name),
  mistakePresetRename: (id, name) => ipcRenderer.invoke(IPC.presetsMistakeRename, id, name),
  mistakePresetRemove: (id) => ipcRenderer.invoke(IPC.presetsMistakeRemove, id),
  languagePresetsList: () => ipcRenderer.invoke(IPC.presetsLanguageList),
  languagePresetAdd: (name) => ipcRenderer.invoke(IPC.presetsLanguageAdd, name),
  languagePresetRename: (id, name) => ipcRenderer.invoke(IPC.presetsLanguageRename, id, name),
  languagePresetRemove: (id) => ipcRenderer.invoke(IPC.presetsLanguageRemove, id),

  solutionAdd: (problemId, draft) => ipcRenderer.invoke(IPC.solutionsAdd, problemId, draft),
  solutionUpdate: (solutionId, draft) =>
    ipcRenderer.invoke(IPC.solutionsUpdate, solutionId, draft),
  solutionRemove: (solutionId) => ipcRenderer.invoke(IPC.solutionsRemove, solutionId),

  reviewDue: () => ipcRenderer.invoke(IPC.reviewsDue),
  reviewList: (problemId) => ipcRenderer.invoke(IPC.reviewsList, problemId),
  reviewSubmit: (problemId, result) => ipcRenderer.invoke(IPC.reviewsSubmit, problemId, result),

  imageGet: (filename) => ipcRenderer.invoke(IPC.imagesGet, filename),

  dataDirGet: () => ipcRenderer.invoke(IPC.dataDirGet),
  dataDirChoose: () => ipcRenderer.invoke(IPC.dataDirChoose),
  dataDirSet: (dir) => ipcRenderer.invoke(IPC.dataDirSet, dir),
  dataDirOpen: () => ipcRenderer.invoke(IPC.dataDirOpen),

  backupExport: () => ipcRenderer.invoke(IPC.backupExport),
  backupImportChoose: () => ipcRenderer.invoke(IPC.backupImportChoose),
  backupImportRun: (filePath) => ipcRenderer.invoke(IPC.backupImportRun, filePath)
}

contextBridge.exposeInMainWorld('api', api)
