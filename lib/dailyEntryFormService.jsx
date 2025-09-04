// services/dailyEntryFormService.js

import { ID, Query } from 'appwrite';
import databaseService from "./databaseService";

const dbId = process.env.NEXT_PUBLIC_APPWRITE_DB_ID;
const colId = process.env.NEXT_PUBLIC_APPWRITE_COL_DAILY_ENTRY_FORM_ID;

const dailyEntryFormService = {
    // ✅ Fetch all entries (not paginated)
    async listDailyEntry() {
        const response = await databaseService.listAllDocuments(dbId, colId);
        if (response.error) return { error: response.error };
        return { data: response.data };
    },

    // ✅ Pagination support
    async listDailyEntryPagination(page = 1, limit = 20) {
        try {
            const offset = (page - 1) * limit;

            const response = await databaseService.listDocuments(dbId, colId, [
                Query.limit(limit),
                Query.offset(offset),
                Query.orderDesc("createdAt"), // Use custom createdAt field
            ]);

            if (response.error) return { error: response.error };
            return { data: response.documents || [] };
        } catch (err) {
            return { error: new Error("Pagination fetch failed: " + err.message) };
        }
    },

    // ✅ Create with meter reading validation
    async createDailyEntry(data) {
        try {
            if (!data.vehicleNumber || !data.meterReading) {
                return {
                    error: new Error("Vehicle number and meter reading are required."),
                };
            }

            // Check last entry for vehicle
            const lastEntryResponse = await databaseService.listDocuments(dbId, colId, [
                Query.equal("vehicleNumber", data.vehicleNumber),
                Query.orderDesc("createdAt"),
                Query.limit(1),
            ]);

            if (lastEntryResponse.error) {
                return { error: lastEntryResponse.error };
            }

            const lastEntry = lastEntryResponse.documents?.[0];

            if (lastEntry) {
                if (Number(data.meterReading) <= Number(lastEntry.meterReading)) {
                    return {
                        error: new Error(
                            "New meter reading must be greater than the last recorded value for this vehicle."
                        ),
                    };
                }
            }

            // Insert createdAt manually (important since you have custom field)
            const payload = {
                ...data,
                createdAt: new Date().toISOString(),
            };

            const createResponse = await databaseService.createDocument(dbId, colId, ID.unique(), payload);
            if (createResponse.error) return { error: createResponse.error };
            return { data: createResponse };
        } catch (err) {
            return { error: new Error("Unexpected error occurred: " + err.message) };
        }
    },

    // ✅ Fetch by Date only
    async fetchByDateOnly(startDateStr, endDateStr) {
        try {
            if (!startDateStr || !endDateStr) return { data: [] };

            const start = new Date(startDateStr);
            const end = new Date(endDateStr);
            end.setDate(end.getDate() + 1);

            const response = await databaseService.listAllDocuments(dbId, colId, [
                Query.greaterThanEqual("$createdAt", start.toISOString()),
                Query.lessThan("$createdAt", end.toISOString()),
            ]);

            if (response.error) return { error: response.error };
            return { data: response.data };
        } catch (err) {
            return { error: new Error("Failed fetchByDateOnly: " + err.message) };
        }
    },

    // ✅ Delete an entry
    async deleteDailyEntry(id) {
        try {
            const response = await databaseService.deleteDocument(dbId, colId, id);
            if (response.error) return { error: response.error };
            return { data: response };
        } catch (err) {
            return { error: new Error('Failed to delete entry: ' + err.message) };
        }
    },

    async fetchEntriesForCsv(userEmails, startDate, endDate) {
        try {
            const queries = [];

            // User filter
            if (userEmails && userEmails.length > 0) {
                queries.push(Query.equal("userEmail", userEmails));
            }

            // Date filter
            if (startDate && endDate) {
                const start = new Date(startDate);
                const end = new Date(endDate);
                end.setDate(end.getDate() + 1);

                queries.push(Query.greaterThanEqual("$createdAt", start.toISOString()));
                queries.push(Query.lessThan("$createdAt", end.toISOString()));
            }

            const response = await databaseService.listAllDocuments(dbId, colId, queries);

            if (response.error) return { error: response.error };
            return { data: response.data || [] };
        } catch (err) {
            return { error: err?.message || "Failed to fetch entries for CSV" };
        }
    },

    // ✅ Fetch by User only
    async fetchByUserOnly(emails) {
        try {
            if (!emails) return { data: [] };

            const emailArray = Array.isArray(emails) ? emails : [emails];

            const response = await databaseService.listAllDocuments(dbId, colId, [
                Query.equal("userEmail", emailArray),
            ]);

            if (response.error) return { error: response.error };
            return { data: response.data };
        } catch (err) {
            return { error: new Error("Failed fetchByUserOnly: " + err.message) };
        }
    },

    // ✅ Fetch by User + Date
    async fetchByUserAndDate(emails, startDateStr, endDateStr) {
        try {
            if (!emails || !startDateStr || !endDateStr) return { data: [] };

            const emailArray = Array.isArray(emails) ? emails : [emails];
            const start = new Date(startDateStr);
            const end = new Date(endDateStr);
            end.setDate(end.getDate() + 1);

            const queries = [
                Query.equal("userEmail", emailArray),
                Query.greaterThanEqual("$createdAt", start.toISOString()),
                Query.lessThan("$createdAt", end.toISOString()),
            ];

            const response = await databaseService.listAllDocuments(dbId, colId, queries);

            if (response.error) return { error: response.error };
            return { data: response.data };
        } catch (err) {
            return { error: new Error("Failed fetchByUserAndDate: " + err.message) };
        }
    },


    // ✅ Get latest reqTripCount for a user
    async getLatestReqTripCountByEmail(email) {
        try {
            const res = await databaseService.listDocuments(dbId, colId, [
                Query.equal("userEmail", email),
                Query.orderDesc("createdAt"),
                Query.limit(1),
            ]);

            if (res.error) return { error: res.error };

            const latestEntry = res.documents?.[0];
            if (!latestEntry) {
                return { data: null };
            }

            return { data: latestEntry.reqTripCount ?? null };
        } catch (error) {
            return { error: new Error("Failed to fetch latest trip count: " + error.message) };
        }
    },
};

export default dailyEntryFormService;
