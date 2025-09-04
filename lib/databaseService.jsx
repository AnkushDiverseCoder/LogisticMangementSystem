import { Query, ID } from "appwrite";
import { database } from "./appwrite";

// ============================
// Retry wrapper utility
// ============================
const withRetry = async (fn, retries = 3, delay = 500) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(res => setTimeout(res, delay));
    }
  }
};

// ============================
// Common reusable queries
// ============================
export const commonQueries = {
  activeOnly: Query.equal("isActive", true),
  createdBy: (email) => Query.equal("userEmail", email),
};

// ============================
// Database Service
// ============================
const databaseService = {
  async listDocuments(databaseId, collectionId, queries = []) {
    try {
      const response = await database.listDocuments(databaseId, collectionId, queries);
      return { documents: response.documents };
    } catch (error) {
      console.error("Error fetching documents:", error.message);
      return { error: error.message };
    }
  },

  async listAllDocuments(databaseId, collectionId, baseQueries = []) {
    const batchSize = 100;
    let allDocuments = [];
    let offset = 0;

    while (true) {
      const paginatedQueries = [
        ...baseQueries,
        Query.offset(offset),
        Query.limit(batchSize),
      ];

      const response = await this.listDocuments(databaseId, collectionId, paginatedQueries);

      if (response.error) return { error: response.error };

      const docs = response.documents || [];
      allDocuments.push(...docs);

      if (docs.length < batchSize) break;
      offset += batchSize;
    }

    return { data: allDocuments };
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

  async getDocument(databaseId, collectionId, documentId) {
    try {
      return await withRetry(() =>
        database.getDocument(databaseId, collectionId, documentId)
      );
    } catch (error) {
      console.error("Error fetching document:", error.message);
      return { error: error.message };
    }
  },

  async getDocumentByAttribute(databaseId, collectionId, key, value) {
    try {
      const response = await this.listDocuments(databaseId, collectionId, [Query.equal(key, value)]);
      if (response.documents?.length) return response.documents[0];
      return { error: "Document not found" };
    } catch (error) {
      console.error("Error fetching document by attribute:", error.message);
      return { error: error.message };
    }
  },

  async createDocument(databaseId, collectionId, data, documentId = ID.unique()) {
    try {
      return await database.createDocument(databaseId, collectionId, documentId, data);
    } catch (error) {
      console.error("Error creating document:", error.message);
      return { error: error.message };
    }
  },

  async updateDocument(databaseId, collectionId, documentId, data) {
    try {
      return await database.updateDocument(databaseId, collectionId, documentId, data);
    } catch (error) {
      console.error("Error updating document:", error.message);
      return { error: error.message };
    }
  },

  async deleteDocument(databaseId, collectionId, documentId) {
    try {
      await database.deleteDocument(databaseId, collectionId, documentId);
      return {};
    } catch (error) {
      console.error("Error deleting document:", error.message);
      return { error: error.message };
    }
  }
};

export default databaseService;
