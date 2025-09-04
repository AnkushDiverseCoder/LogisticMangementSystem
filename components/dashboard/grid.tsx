import React from "react";

const DATA = [
    {
        id: 1,
        icon: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/google-icon.svg",
        title: "Google Sheets",
        description:
            "Easily sync your data with Google Sheets for seamless automation.",
    },
    {
        id: 2,
        icon: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/slack-icon.svg",
        title: "Slack",
        description:
            "Receive updates and notifications directly in your Slack channels.",
    },
    {
        id: 3,
        icon: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/sketch-icon.svg",
        title: "Sketch",
        description:
            "Import your designs from Sketch and streamline your design process",
    },
    {
        id: 4,
        icon: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/gatsby-icon.svg",
        title: "Gatsby",
        description: "Build blazing-fast websites with Gatsby integration.",
    },
    {
        id: 5,
        icon: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/spotify-icon.svg",
        title: "Shopify",
        description:
            "Sync your Shopify store data and streamline order management.",
    },
    {
        id: 6,
        icon: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/github-icon.svg",
        title: "Github",
        description:
            "Automate your workflows and track changes with Github integration.",
    },
    {
        id: 7,
        icon: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/figma-icon.svg",
        title: "Figma",
        description: "Sync your Figma designs and streamline your design process.",
    },
    {
        id: 8,
        icon: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/dropbox-icon.svg",
        title: "Dropbox",
        description: "Sync your Dropbox files and streamline your file management.",
    },
];

interface Integration9Props {
    title?: string;
    data?: typeof DATA;
    gridCols?: string;
}

const Grid = ({
    data = DATA,
}: Integration9Props) => {
    return (
        <section className="py-16">
            <div className="container">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {data.map(({ id, icon, title, description }) => (
                        <div
                            key={id}
                            className="flex min-h-[140px] flex-col items-start rounded-xl border bg-background p-6 shadow-sm transition hover:shadow-md"
                        >
                            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                                <img
                                    src={icon}
                                    alt={title}
                                    width={32}
                                    height={32}
                                    className="h-8 w-8 object-contain"
                                />
                            </div>
                            <div className="mb-1 text-base font-medium">{title}</div>
                            <div className="text-xs leading-snug text-muted-foreground">
                                {description}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export { Grid };
