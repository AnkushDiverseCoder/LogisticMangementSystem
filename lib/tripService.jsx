// services/tripService.js
// ✅ Next.js Optimized Version
// - Uses NEXT_PUBLIC_ env variables
// - Consistent error handling
// - Ensures compatibility for server/client usage

import { ID, Query } from "appwrite";
import databaseService from "./databaseService";
import authService from "./authService";
import employeeGlobalService from "./employeeGlobalService";

const dbId = process.env.NEXT_PUBLIC_APPWRITE_DB_ID;
const colId = process.env.NEXT_PUBLIC_APPWRITE_COL_TRIP_ID;

const tripService = {
  // ============================
  // 🔹 Utility Helpers
  // ============================

  buildDateQuery(startDateStr, endDateStr) {
    if (!startDateStr || !endDateStr) return [];
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    end.setDate(end.getDate() + 1);
    return [
      Query.greaterThanEqual("$createdAt", start.toISOString()),
      Query.lessThan("$createdAt", end.toISOString()),
    ];
  },

  buildUserQuery(emails) {
    if (!emails) return [];
    const emailArray = Array.isArray(emails) ? emails : [emails];
    return [Query.equal("userEmail", emailArray)];
  },

  // ============================
  // 🔹 Basic List & Pagination
  // ============================

  async listTrips() {
    try {
      const response = await databaseService.listAllDocuments(dbId, colId);
      return { data: response.data || [] };
    } catch (err) {
      return { error: err?.message || "Failed to fetch trips" };
    }
  },

  async listTripsPagination(pageNumber = 1, pageSize = 20) {
    const offset = (pageNumber - 1) * pageSize;
    const queries = [
      Query.offset(offset),
      Query.limit(pageSize),
      Query.orderDesc("$createdAt"),
    ];

    try {
      const response = await databaseService.listDocuments(dbId, colId, queries);
      return {
        data: response.documents || [],
        currentPage: pageNumber,
        pageSize,
        error: null,
      };
    } catch (err) {
      return { data: [], currentPage: pageNumber, pageSize, error: err?.message || "Failed to fetch trips with pagination" };
    }
  },

  async searchTrips({
    search,
    pageNumber = 1,
    pageSize = 20,
    startDate,
    endDate,
  }) {
    try {
      const offset = (pageNumber - 1) * pageSize;

      const queries = [
        Query.limit(pageSize),
        Query.offset(offset),
        Query.orderDesc("$createdAt"),
      ];

      // 🔹 Date filter
      if (startDate && endDate) {
        queries.push(Query.greaterThanEqual("$createdAt", startDate));
        queries.push(Query.lessThan("$createdAt", endDate));
      }

      // 🔹 Search filter across multiple fields
      if (search && search.trim() !== "") {
        queries.push(
          Query.or([
            Query.startsWith("siteName", search),
            Query.startsWith("vehicleNumber", search),
            Query.startsWith("tripId", search),
            Query.startsWith("userEmail", search),
          ])
        );
      }

      const response = await databaseService.listDocuments(dbId, colId, queries);

      return {
        data: response.documents || [],
        currentPage: pageNumber,
        pageSize,
        error: null,
      };
    } catch (err) {
      return {
        data: [],
        currentPage: pageNumber,
        pageSize,
        error: err?.message || "Failed to search trips",
      };
    }
  },

  async listAllDocumentsFast(databaseId, collectionId, baseQueries = [], startDate, endDate, batchLimit = 1000) {
    try {
      let allDocuments = [];

      if (!startDate || !endDate) {
        const res = await this.listDocuments(databaseId, collectionId, [
          ...baseQueries,
          Query.limit(batchLimit),
          Query.orderDesc("$createdAt"),
        ]);
        if (res.error) return { error: res.error };
        return { data: res.documents || [] };
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      const dateRanges = [];
      let current = new Date(start);

      while (current <= end) {
        const next = new Date(current);
        next.setDate(current.getDate() + 1);
        dateRanges.push([new Date(current), new Date(next)]);
        current = next;
      }

      const promises = dateRanges.map(([s, e]) =>
        this.listDocuments(databaseId, collectionId, [
          ...baseQueries,
          Query.greaterThanEqual("$createdAt", s.toISOString()),
          Query.lessThan("$createdAt", e.toISOString()),
          Query.limit(batchLimit),
          Query.orderDesc("$createdAt"),
        ])
      );

      const results = await Promise.all(promises);

      results.forEach(r => {
        if (r.documents) allDocuments.push(...r.documents);
      });

      return { data: allDocuments };
    } catch (err) {
      return { error: err.message || "Failed to fetch documents fast" };
    }
  },

  async listAttachedTripsPagination(pageNumber = 1, pageSize = 20) {
    const offset = (pageNumber - 1) * pageSize;
    try {
      const { data: users } = await authService.fetchAllUsers();
      const attachedUserEmails = (users || [])
        .filter((u) => u.labels?.includes("attached"))
        .map((u) => u.email);

      if (!attachedUserEmails.length) {
        return { data: [], currentPage: pageNumber, pageSize };
      }

      const queries = [
        Query.offset(offset),
        Query.limit(pageSize),
        Query.orderDesc("$createdAt"),
        Query.equal("userEmail", attachedUserEmails),
      ];
      const response = await databaseService.listDocuments(dbId, colId, queries);

      return {
        data: response.documents || [],
        currentPage: pageNumber,
        pageSize,
      };
    } catch (err) {
      return { error: err?.message || "Failed to fetch attached trips" };
    }
  },

  // ============================
  // 🔹 Trip Updates
  // ============================

  async updateTripAsEdited(tripId, data) {
    return this.updateTrip(tripId, { ...data, edited: true });
  },

  async updateTrip(tripId, data) {
    try {
      const response = await databaseService.updateDocument(
        dbId,
        colId,
        tripId,
        data
      );
      return { data: response };
    } catch (err) {
      return { error: err?.message || "Failed to update trip" };
    }
  },

  async deleteTrip(tripId) {
    try {
      const response = await databaseService.deleteDocument(dbId, colId, tripId);
      return { data: response };
    } catch (err) {
      return { error: err?.message || "Failed to delete trip" };
    }
  },

  // ============================
  // 🔹 Trip Fetching
  // ============================

  async fetchTripsByDate(userEmail, targetDateStr) {
    try {
      const start = new Date(targetDateStr);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const response = await databaseService.listAllDocuments(dbId, colId, [
        Query.equal("userEmail", userEmail),
        Query.greaterThanEqual("$createdAt", start.toISOString()),
        Query.lessThan("$createdAt", end.toISOString()),
      ]);

      const completedTrips = response.data.filter(
        (t) => t.startKm > 0 && t.endKm > 0
      );

      return {
        data: {
          totalTrips: response.data.length,
          completedTripsCount: completedTrips.length,
          completedTrips,
          allTrips: response.data,
        },
      };
    } catch (err) {
      return { error: err?.message || "Failed to fetch trips by date" };
    }
  },

  async fetchLatestUserTrip(userEmail) {
    try {
      const response = await databaseService.listDocuments(dbId, colId, [
        Query.equal("userEmail", userEmail),
        Query.orderDesc("$createdAt"),
        Query.limit(1),
      ]);
      const trip = response.documents?.[0];
      if (!trip) return { error: "No trip found for this user" };
      return { data: trip };
    } catch (err) {
      return { error: err?.message || "Failed to fetch latest user trip" };
    }
  },

  async fetchMonthlyTripCount(userEmail) {
    try {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const response = await databaseService.listAllDocuments(dbId, colId, [
        Query.equal("userEmail", userEmail),
        Query.greaterThanEqual("$createdAt", start.toISOString()),
        Query.lessThanEqual("$createdAt", end.toISOString()),
      ]);

      return { data: response.data.length };
    } catch (err) {
      return { error: err?.message || "Failed to fetch monthly trip count" };
    }
  },

  // ============================
  // 🔹 Trip Creation
  // ============================

  async createTrip(data) {
    try {
      const latestTrip = await this.fetchLatestUserTrip(data.userEmail);
      if (latestTrip?.data) {
        const { startKm, endKm } = latestTrip.data;
        const valid =
          startKm && endKm && !isNaN(startKm) && !isNaN(endKm) && startKm > 0 && endKm > 0;
        if (!valid) {
          return {
            error: "Cannot create new trip. Previous trip is incomplete.",
          };
        }
      }

      const existing = await this.findTripByTripId(data.tripId);
      if (existing) {
        return { error: "Trip ID already exists. Please use a unique ID." };
      }

      const newId = ID.unique();
      const response = await databaseService.createDocument(dbId, colId, newId, data);
      return { data: response };
    } catch (err) {
      return { error: err?.message || "Error while creating trip." };
    }
  },

  async findTripByTripId(tripId) {
    try {
      const res = await databaseService.listDocuments(dbId, colId, [
        Query.equal("tripId", tripId),
      ]);
      return res.documents[0] || null;
    } catch {
      return null;
    }
  },

  // ============================
  // 🔹 Flexible Queries
  // ============================

  async fetchTripsByDateOnly(startDateStr, endDateStr) {
    const queries = this.buildDateQuery(startDateStr, endDateStr);
    if (!queries.length) return { data: [] };

    try {
      const response = await databaseService.listAllDocuments(dbId, colId, queries);
      return { data: response.data };
    } catch (err) {
      return { error: err?.message || "Failed to fetch trips by date" };
    }
  },

  async fetchTripsByUserOnly(userEmails) {
    const queries = this.buildUserQuery(userEmails);
    if (!queries.length) return { data: [] };

    try {
      const response = await databaseService.listAllDocuments(dbId, colId, queries);
      return { data: response.data };
    } catch (err) {
      return { error: err?.message || "Failed to fetch trips by user" };
    }
  },

  async fetchTripsByUserAndDate(userEmails, startDateStr, endDateStr) {
    const queries = [
      ...this.buildUserQuery(userEmails),
      ...this.buildDateQuery(startDateStr, endDateStr),
    ];
    if (!queries.length) return { data: [] };

    try {
      const response = await databaseService.listAllDocuments(dbId, colId, queries);
      return { data: response.data };
    } catch (err) {
      return { error: err?.message || "Failed to fetch trips by user and date" };
    }
  },

  // ============================
  // 🔹 Incomplete Trip Status
  // ============================

  async getEmployeeIncompleteStatus(email) {
    try {
      const today = new Date().toISOString().split("T")[0];
      const [dailyRes, monthlyRes] = await Promise.all([
        this.fetchUserTripCounts("today", today),
        this.fetchUserTripCounts("month"),
      ]);

      if (dailyRes.error || monthlyRes.error) {
        return { error: dailyRes.error || monthlyRes.error };
      }

      const daily = dailyRes.data?.[email.toLowerCase()];
      const monthly = monthlyRes.data?.[email.toLowerCase()];

      return {
        data: {
          dailyIncomplete: !daily || daily.count < daily.reqTripCount,
          monthlyIncomplete: !monthly || monthly.count < monthly.reqTripCount,
          daily: daily || { count: 0, reqTripCount: 0 },
          monthly: monthly || { count: 0, reqTripCount: 0 },
        },
      };
    } catch (err) {
      return { error: err?.message || "Failed to get incomplete trip status" };
    }
  },

  async fetchUserTripCounts(mode = "today", dateParam = null) {
    let start, end;

    if (mode === "month") {
      const date = dateParam ? new Date(dateParam) : new Date();
      start = new Date(date.getFullYear(), date.getMonth(), 1, 7, 0, 0, 0);
      end = new Date(date.getFullYear(), date.getMonth() + 1, 1, 6, 59, 59, 999);
    } else {
      const ref = dateParam ? new Date(dateParam) : new Date();
      const dayStart = new Date(
        ref.getFullYear(),
        ref.getMonth(),
        ref.getDate(),
        7,
        0,
        0,
        0
      );
      if (ref < dayStart) dayStart.setDate(dayStart.getDate() - 1);
      start = new Date(dayStart);
      end = new Date(dayStart);
      end.setDate(end.getDate() + 1);
      end.setHours(6, 59, 59, 999);
    }

    try {
      const tripRes = await databaseService.listAllDocuments(dbId, colId, [
        Query.greaterThanEqual("$createdAt", start.toISOString()),
        Query.lessThan("$createdAt", end.toISOString()),
      ]);

      const tripCounts = {};
      (tripRes.data || []).forEach((t) => {
        const email = t.userEmail?.toLowerCase();
        if (!email) return;
        tripCounts[email] = (tripCounts[email] || 0) + 1;
      });

      const globalRes = await employeeGlobalService.listEntries([
        Query.greaterThanEqual("createdAt", start.toISOString()),
        Query.lessThan("createdAt", end.toISOString()),
      ]);
      if (!globalRes.success) return { error: globalRes.error };

      const latestReqMap = {};
      for (const e of globalRes.data.data) {
        const email = e.userEmail?.toLowerCase();
        if (!email) continue;
        if (
          !latestReqMap[email] ||
          new Date(e.createdAt) > new Date(latestReqMap[email].createdAt)
        ) {
          latestReqMap[email] = e;
        }
      }

      const result = {};
      for (const [email, count] of Object.entries(tripCounts)) {
        result[email] = { count, reqTripCount: latestReqMap[email]?.reqTripCount ?? 0 };
      }
      for (const email of Object.keys(latestReqMap)) {
        if (!result[email]) {
          result[email] = {
            count: 0,
            reqTripCount: latestReqMap[email].reqTripCount ?? 0,
          };
        }
      }

      return { data: result };
    } catch (err) {
      return { error: err?.message || "Failed to fetch user trip counts" };
    }
  },
};

export default tripService;
