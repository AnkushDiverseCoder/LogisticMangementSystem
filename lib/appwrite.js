import { Client, Databases,Storage, Account,Models } from "appwrite"

const config = {
  endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
  projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
  db: process.env.NEXT_PUBLIC_APPWRITE_DB_ID,
  col: {
    trips: process.env.NEXT_PUBLIC_APPWRITE_COL_TRIP_ID,
    dailyEntryForm: process.env.NEXT_PUBLIC_APPWRITE_COL_DAILY_ENTRY_FORM_ID,
    users: process.env.NEXT_PUBLIC_APPWRITE_COL_USERS,
    userfilesmeta: process.env.NEXT_PUBLIC_APPWRITE_COL_USERFILESMETA,
    vehicleEntry: process.env.NEXT_PUBLIC_APPWRITE_COL_VEHICLE_ENTRY,
    advanceEntry: process.env.NEXT_PUBLIC_APPWRITE_COL_ADVANCE_ENTRY,
    clientList: process.env.NEXT_PUBLIC_APPWRITE_COL_CLIENT_ENTRY,
    employeeComplaint: process.env.NEXT_PUBLIC_APPWRITE_COL_USER_COMPLAINT,
    employeeGlobalData: process.env.NEXT_PUBLIC_APPWRITE_COL_EMPLOYEE_GLOBAL_DATA,
    transaction: process.env.NEXT_PUBLIC_APPWRITE_COL_TRANSACTION,
  },
  bucket: {
    userFiles: process.env.NEXT_PUBLIC_APPWRITE_BUCKET_USER_FILES,
  },
}

const client = new Client().setEndpoint(config.endpoint).setProject(config.projectId)

const database = new Databases(client)
const account = new Account(client)
const storage = new Storage(client);

export { client,storage, database, account, config }

