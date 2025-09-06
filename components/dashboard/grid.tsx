import Link from "next/link";
import { MdDashboard, MdOutlineArticle, MdCarRepair, MdStore, MdReport, MdPersonAdd, MdDownload, MdHomeWork } from "react-icons/md";

export const DATA = [
    {
        id: 1,
        icon: <MdDashboard className="text-red-500 w-10 h-10" />,
        title: "Dashboard",
        description: "Easily access the Dashboard for quick insights and monitoring.",
        url: "/",
    },
    {
        id: 2,
        icon: <MdOutlineArticle className="text-blue-500 w-10 h-10" />,
        title: "Daily Entry",
        description: "Easily record Daily Entry for seamless operations and tracking.",
        url: "/dailyentry",
    },
    {
        id: 3,
        icon: <MdCarRepair className="text-green-500 w-10 h-10" />,
        title: "Vehicle Entry",
        description: "Easily log Vehicle Entry for smooth vehicle management process.",
        url: "/vehicleentry",
    },
    {
        id: 4,
        icon: <MdHomeWork className="text-yellow-500 w-10 h-10" />,
        title: "Site Entry",
        description: "Easily add Site Entry for proper site management and monitoring.",
        url: "/siteentry",
    },
    {
        id: 5,
        icon: <MdReport className="text-purple-500 w-10 h-10" />,
        title: "Client Complaint",
        description: "Easily manage Client Complaint for efficient problem resolution.",
        url: "/clientcomplaint",
    },
    {
        id: 6,
        icon: <MdOutlineArticle className="text-pink-500 w-10 h-10" />,
        title: "Create Daily Entry",
        description: "Easily create Daily Entry for streamlined daily recording process.",
        url: "/createdailyentry",
    },
    {
        id: 7,
        icon: <MdPersonAdd className="text-indigo-500 w-10 h-10" />,
        title: "Sign Up",
        description: "Easily Sign Up new users for quick account setup and access.",
        url: "/signup",
    },
    {
        id: 8,
        icon: <MdDownload className="text-teal-500 w-10 h-10" />,
        title: "Download",
        description: "Easily Download files and resources for your convenience and use.",
        url: "/download",
    },
];






interface Integration9Props {
    title?: string;
    data?: typeof DATA;
    gridCols?: string;
}

const Grid = ({ data = DATA }: Integration9Props) => {
    return (
        <section className="py-16">
            <div className="container">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {data.map(({ id, icon, title, description, url }) => (
                        <Link
                            key={id}
                            href={url}
                            className="flex min-h-[140px] flex-col items-start rounded-xl border bg-background p-6 shadow-sm transition hover:shadow-md"
                        >
                            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-muted text-2xl">
                                {icon}
                            </div>
                            <div className="mb-1 text-base font-medium">{title}</div>
                            <div className="text-xs leading-snug text-muted-foreground">
                                {description}
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
};

export { Grid };
