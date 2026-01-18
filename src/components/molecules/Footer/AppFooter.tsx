const AUTHOR = "Gabriel Capilla";
const GITHUB_URL = "https://github.com/gabrielcapilla";

export const AppFooter: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <p>
        Interlingua v2.0.0 &copy; {year} | Crafted by {AUTHOR} |{" "}
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="app-footer_link"
          title={`Visit ${AUTHOR}'s GitHub profile`}
        >
          GitHub
        </a>
      </p>
    </footer>
  );
};
