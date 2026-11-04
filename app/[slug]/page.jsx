import { notFound } from "next/navigation";
import { PAGES } from "@/lib/pages";
import ContactForm from "@/components/ContactForm";

export const dynamicParams = false;
export const generateStaticParams = () => Object.keys(PAGES).map((slug) => ({ slug }));
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const page = PAGES[slug];
  return {
    title: page?.title ?? "Information",
    description: page?.description ?? "Store information from Y.",
    alternates: { canonical: `/${slug}` },
  };
}

export default async function InfoPage({ params }) {
  const { slug } = await params;
  const page = PAGES[slug];
  if (!page) notFound();
  return (
    <div className={"wrap view" + (page.img ? " info-split" : "")}>
      <div className="prose">
        <div className="kicker">{page.kicker || "Y Store"}{page.kickerAr && <span className="ar-i" lang="ar">{page.kickerAr}</span>}</div>
        <h1 className="serif vh">{page.title}</h1>
        <div dangerouslySetInnerHTML={{ __html: page.html }} />
        {page.form && <ContactForm />}
      </div>
      {page.img && <figure className="info-art"><img src={page.img} alt={page.imgAlt} /></figure>}
    </div>
  );
}
