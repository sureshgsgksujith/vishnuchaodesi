type StaticTemplatePageProps = {
  src: string;
  title: string;
};

export default function StaticTemplatePage({
  src,
  title,
}: StaticTemplatePageProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        margin: 0,
        padding: 0,
        overflow: "hidden",
        background: "#fff",
      }}
    >
      <iframe
        src={src}
        title={title}
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          display: "block",
        }}
      />
    </div>
  );
}