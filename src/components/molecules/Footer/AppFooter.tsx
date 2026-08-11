import type { FC } from "react";

const AUTHOR = "Gabriel Capilla";
const AUTHOR_URL = "https://gabrielcapilla.github.io";
const GITHUB_URL = "https://github.com/gabrielcapilla";

export const AppFooter: FC = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <p>
        Interlingua v2.0.1 &copy; {year} | Crafted by{" "}
        <a
          href={AUTHOR_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="app-footer_link"
          title={`Visit ${AUTHOR}'s website`}
        >
          {AUTHOR}
        </a>{" "}
        |{" "}
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
