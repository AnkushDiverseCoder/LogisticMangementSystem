import { ID, Query } from 'appwrite';
import databaseService from './databaseService';

const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DB_ID;
const EMPLOYEE_GLOBAL_COLLECTION_ID = process.env.EXPO_PUBLIC_APPWRITE_COL_EMPLOYEE_GLOBAL_DATA;

const employeeGlobalService = {
    async listEntries(queries = []) {
        try {
            const res = await databaseService.listAllDocuments(DATABASE_ID, EMPLOYEE_GLOBAL_COLLECTION_ID, queries);
            return { success: true, data: res };
        } catch (error) {
            return { success: false, error: error.message || 'Failed to fetch entries' };
        }
    },

    async createEntry(data) {
        try {
            const res = await databaseService.createDocument(DATABASE_ID, EMPLOYEE_GLOBAL_COLLECTION_ID, ID.unique(), data);
            return { success: true, data: res };
        } catch (error) {
            return { success: false, error: error.message || 'Failed to create entry' };
        }
    },

    async updateEntry(documentId, data) {
        try {
            const res = await databaseService.updateDocument(DATABASE_ID, EMPLOYEE_GLOBAL_COLLECTION_ID, documentId, data);
            return { success: true, data: res };
        } catch (error) {
            return { success: false, error: error.message || 'Failed to update entry' };
        }
    },

    async createOrUpdateEntry(form, selectedEmployee, mileage) {
        try {
            const fuelQuantity = parseFloat(form.fuelQuantity);
            const currentMeter = parseFloat(form.meterReading);
            const totalDistance = fuelQuantity * mileage;

            const prevRes = await this.listEntries([
                Query.equal('userEmail', [selectedEmployee.email]),
                Query.equal('vehicleNumber', [form.vehicleNumber]),
                Query.orderDesc('createdAt'),
                Query.limit(1),
            ]);
            const prev = prevRes?.data?.data?.[0];
            const isFirstEntry = !prev;
            const previousMeterReading = prev?.meterReading || 0;
            const previousRemaining = prev?.remainingDistance || 0;

            const runningKm = isFirstEntry ? 0 : currentMeter - previousMeterReading;

            // ✅ Fixed logic for remainingDistance
            const remainingDistance = isFirstEntry
                ? totalDistance
                : (previousRemaining - runningKm) + totalDistance;

            const payload = {
                meterReading: currentMeter,
                previousMeterReading,
                totalDistance: runningKm,
                remainingDistance,
                fuelFilled: fuelQuantity,
                mileage: parseInt(mileage),
                notes: '',
                reqTripCount:parseInt(form.reqTripCount),
                userEmail: selectedEmployee.email,
                vehicleNumber: form.vehicleNumber,
                createdAt: new Date().toISOString(),
            };

            return await this.createEntry(payload);

        } catch (error) {
            return {
                success: false,
                error: error.message || 'Failed to create global entry',
            };
        }
    },

    async getMonthlyMileageSummary({ userEmail, vehicleNumber }) {
        try {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

            const queries = [
                Query.greaterThanEqual('createdAt', startOfMonth),
                Query.lessThanEqual('createdAt', endOfMonth),
            ];

            if (userEmail) queries.push(Query.equal('userEmail', [userEmail]));
            if (vehicleNumber) queries.push(Query.equal('vehicleNumber', [vehicleNumber]));

            const res = await this.listEntries(queries);

            const entries = res?.data?.data || [];

            if (entries.length === 0) {
                return { success: true, totalDistance: 0, averageMileage: 0, entryCount: 0 };
            }

            const totalDistance = entries.reduce((sum, entry) => sum + (entry.totalDistance || 0), 0);
            const totalMileage = entries.reduce((sum, entry) => sum + (entry.mileage || 0), 0);
            const averageMileage = totalMileage / entries.length;

            return {
                success: true,
                totalDistance,
                averageMileage: Math.round(averageMileage),
                entryCount: entries.length,
            };

        } catch (error) {
            return {
                success: false,
                error: error.message || 'Failed to fetch monthly mileage summary',
            };
        }
    },

    async getVehicleWiseFuelEfficiency({ from, to } = {}) {
        try {
            const queries = [];

            // Apply optional date range
            if (from) queries.push(Query.greaterThanEqual('createdAt', new Date(from).toISOString()));
            if (to) queries.push(Query.lessThanEqual('createdAt', new Date(to).toISOString()));

            const res = await this.listEntries(queries);
            const entries = res?.data?.data || [];

            if (entries.length === 0) {
                return { success: true, data: [] };
            }

            // Group by vehicle
            const vehicleStats = {};

            for (const entry of entries) {
                const vehicle = entry.vehicleNumber || 'Unknown';
                if (!vehicleStats[vehicle]) {
                    vehicleStats[vehicle] = {
                        totalDistance: 0,
                        totalFuel: 0,
                        entries: 0,
                    };
                }

                vehicleStats[vehicle].totalDistance += entry.totalDistance || 0;
                vehicleStats[vehicle].totalFuel += entry.fuelFilled || 0;
                vehicleStats[vehicle].entries += 1;
            }

            const result = Object.entries(vehicleStats).map(([vehicleNumber, stats]) => ({
                vehicleNumber,
                totalDistance: stats.totalDistance,
                totalFuel: stats.totalFuel,
                averageEfficiency:
                    stats.totalFuel > 0
                        ? parseFloat((stats.totalDistance / stats.totalFuel).toFixed(2))
                        : 0,
                entryCount: stats.entries,
            }));

            return { success: true, data: result };

        } catch (error) {
            return {
                success: false,
                error: error.message || 'Failed to generate vehicle-wise efficiency report',
            };
        }
    }



};

export default employeeGlobalService;
