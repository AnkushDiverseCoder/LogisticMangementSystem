// import { Grid } from "@/components/dashboard/grid";
import TripsTable from "@/components/dashboard/tripsTable";

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 items-center">
      {/* <Grid /> */}
      <TripsTable />
    </div>
  );
}
