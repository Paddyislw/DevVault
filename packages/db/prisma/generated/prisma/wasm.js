
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.CustomStatusScalarFieldEnum = {
  id: 'id',
  workspaceId: 'workspaceId',
  name: 'name',
  color: 'color',
  icon: 'icon',
  position: 'position',
  baseStatus: 'baseStatus',
  createdAt: 'createdAt'
};

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  telegramId: 'telegramId',
  name: 'name',
  email: 'email',
  masterPasswordHash: 'masterPasswordHash',
  aiSettings: 'aiSettings',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.WorkspaceScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  name: 'name',
  slug: 'slug',
  color: 'color',
  icon: 'icon',
  isDefault: 'isDefault',
  type: 'type',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TaskScalarFieldEnum = {
  id: 'id',
  workspaceId: 'workspaceId',
  title: 'title',
  description: 'description',
  priority: 'priority',
  status: 'status',
  dueDate: 'dueDate',
  isBacklog: 'isBacklog',
  isSomeday: 'isSomeday',
  position: 'position',
  parentTaskId: 'parentTaskId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  customStatusId: 'customStatusId'
};

exports.Prisma.TaskAttachmentScalarFieldEnum = {
  id: 'id',
  taskId: 'taskId',
  type: 'type',
  content: 'content',
  language: 'language',
  url: 'url',
  fileName: 'fileName',
  createdAt: 'createdAt'
};

exports.Prisma.TagScalarFieldEnum = {
  id: 'id',
  workspaceId: 'workspaceId',
  name: 'name',
  color: 'color',
  createdAt: 'createdAt'
};

exports.Prisma.SnippetScalarFieldEnum = {
  id: 'id',
  workspaceId: 'workspaceId',
  title: 'title',
  code: 'code',
  language: 'language',
  tags: 'tags',
  usageCount: 'usageCount',
  isFavorite: 'isFavorite',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ScratchpadScalarFieldEnum = {
  id: 'id',
  workspaceId: 'workspaceId',
  content: 'content',
  language: 'language',
  expiresAt: 'expiresAt',
  isPromoted: 'isPromoted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.NoteScalarFieldEnum = {
  id: 'id',
  workspaceId: 'workspaceId',
  title: 'title',
  content: 'content',
  type: 'type',
  command: 'command',
  language: 'language',
  warning: 'warning',
  source: 'source',
  tags: 'tags',
  isPinned: 'isPinned',
  copyCount: 'copyCount',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CredentialScalarFieldEnum = {
  id: 'id',
  workspaceId: 'workspaceId',
  name: 'name',
  service: 'service',
  encryptedData: 'encryptedData',
  iv: 'iv',
  salt: 'salt',
  category: 'category',
  lastCopiedAt: 'lastCopiedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BookmarkScalarFieldEnum = {
  id: 'id',
  workspaceId: 'workspaceId',
  url: 'url',
  title: 'title',
  description: 'description',
  favicon: 'favicon',
  category: 'category',
  tags: 'tags',
  isAlive: 'isAlive',
  lastCheckedAt: 'lastCheckedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EnvSetScalarFieldEnum = {
  id: 'id',
  workspaceId: 'workspaceId',
  projectName: 'projectName',
  environment: 'environment',
  variables: 'variables',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ApiEndpointScalarFieldEnum = {
  id: 'id',
  workspaceId: 'workspaceId',
  name: 'name',
  url: 'url',
  method: 'method',
  headers: 'headers',
  body: 'body',
  authType: 'authType',
  projectName: 'projectName',
  lastPingStatus: 'lastPingStatus',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ActivityLogScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  action: 'action',
  entityType: 'entityType',
  entityId: 'entityId',
  metadata: 'metadata',
  createdAt: 'createdAt'
};

exports.Prisma.StandupScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  date: 'date',
  content: 'content',
  deliveredVia: 'deliveredVia',
  createdAt: 'createdAt'
};

exports.Prisma.RecapScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  periodStart: 'periodStart',
  periodEnd: 'periodEnd',
  type: 'type',
  content: 'content',
  stats: 'stats',
  createdAt: 'createdAt'
};

exports.Prisma.ReminderScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  workspaceId: 'workspaceId',
  title: 'title',
  description: 'description',
  remindAt: 'remindAt',
  repeatRule: 'repeatRule',
  repeatEndDate: 'repeatEndDate',
  category: 'category',
  priority: 'priority',
  linkedEntityType: 'linkedEntityType',
  linkedEntityId: 'linkedEntityId',
  status: 'status',
  snoozedUntil: 'snoozedUntil',
  deliveredAt: 'deliveredAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ProjectIdeaScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  title: 'title',
  description: 'description',
  techStack: 'techStack',
  status: 'status',
  references: 'references',
  promotedToWorkspaceId: 'promotedToWorkspaceId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};
exports.TaskStatus = exports.$Enums.TaskStatus = {
  TODO: 'TODO',
  BACKLOG: 'BACKLOG',
  UP_NEXT: 'UP_NEXT',
  IN_PROGRESS: 'IN_PROGRESS',
  BLOCKED: 'BLOCKED',
  IN_REVIEW: 'IN_REVIEW',
  DONE: 'DONE',
  CANCELLED: 'CANCELLED'
};

exports.WorkspaceType = exports.$Enums.WorkspaceType = {
  PERSONAL: 'PERSONAL',
  WORK: 'WORK',
  CUSTOM: 'CUSTOM'
};

exports.TaskPriority = exports.$Enums.TaskPriority = {
  P1: 'P1',
  P2: 'P2',
  P3: 'P3',
  P4: 'P4'
};

exports.AttachmentType = exports.$Enums.AttachmentType = {
  CODE: 'CODE',
  IMAGE: 'IMAGE',
  LINK: 'LINK',
  FILE: 'FILE'
};

exports.NoteType = exports.$Enums.NoteType = {
  NOTE: 'NOTE',
  COMMAND: 'COMMAND'
};

exports.CredentialCategory = exports.$Enums.CredentialCategory = {
  API_KEY: 'API_KEY',
  DATABASE: 'DATABASE',
  SERVICE: 'SERVICE',
  SSH: 'SSH',
  OTHER: 'OTHER'
};

exports.BookmarkCategory = exports.$Enums.BookmarkCategory = {
  DESIGN: 'DESIGN',
  CODE: 'CODE',
  TUTORIALS: 'TUTORIALS',
  TOOLS: 'TOOLS',
  APIS_DOCS: 'APIS_DOCS',
  CUSTOM: 'CUSTOM'
};

exports.EnvEnvironment = exports.$Enums.EnvEnvironment = {
  DEV: 'DEV',
  STAGING: 'STAGING',
  PROD: 'PROD'
};

exports.ApiMethod = exports.$Enums.ApiMethod = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE'
};

exports.ApiAuthType = exports.$Enums.ApiAuthType = {
  NONE: 'NONE',
  BEARER: 'BEARER',
  API_KEY: 'API_KEY',
  BASIC: 'BASIC'
};

exports.RecapType = exports.$Enums.RecapType = {
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY'
};

exports.ReminderRepeat = exports.$Enums.ReminderRepeat = {
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY'
};

exports.ReminderCategory = exports.$Enums.ReminderCategory = {
  PROFESSIONAL: 'PROFESSIONAL',
  PERSONAL: 'PERSONAL',
  BILLING: 'BILLING',
  INFRA: 'INFRA',
  CUSTOM: 'CUSTOM'
};

exports.ReminderStatus = exports.$Enums.ReminderStatus = {
  PENDING: 'PENDING',
  DELIVERED: 'DELIVERED',
  SNOOZED: 'SNOOZED',
  DISMISSED: 'DISMISSED'
};

exports.IdeaStatus = exports.$Enums.IdeaStatus = {
  RAW: 'RAW',
  EXPLORING: 'EXPLORING',
  COMMITTED: 'COMMITTED',
  ABANDONED: 'ABANDONED'
};

exports.Prisma.ModelName = {
  CustomStatus: 'CustomStatus',
  User: 'User',
  Workspace: 'Workspace',
  Task: 'Task',
  TaskAttachment: 'TaskAttachment',
  Tag: 'Tag',
  Snippet: 'Snippet',
  Scratchpad: 'Scratchpad',
  Note: 'Note',
  Credential: 'Credential',
  Bookmark: 'Bookmark',
  EnvSet: 'EnvSet',
  ApiEndpoint: 'ApiEndpoint',
  ActivityLog: 'ActivityLog',
  Standup: 'Standup',
  Recap: 'Recap',
  Reminder: 'Reminder',
  ProjectIdea: 'ProjectIdea'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
