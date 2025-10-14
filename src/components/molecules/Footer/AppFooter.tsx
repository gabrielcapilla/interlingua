import React from "react";

/**
 * @description Renders the main footer for the application. It displays the app name, version, copyright, author, and a link to a GitHub profile.
 * @interactions
 * - **CSS:** Relies on the `.app-footer` and `.app-footer_link` classes in `index.css` for its layout and styling.
 * - **Parent Component:** Rendered by `TranslationPage` to provide a consistent footer at the bottom of the page.
 */
const AppFooterComponent: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const authorName = "Gabriel Capilla";
  const githubUrl = "https://github.com/gabrielcapilla";

  return (
    <footer className="app-footer">
      <p>
        Interlingua v1.0.0 &copy; {currentYear} | Crafted by {authorName} |{" "}
        <a
          href={githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="app-footer_link"
          title={`Visit ${authorName}'s GitHub profile`}
        >
          GitHub
        </a>
      </p>
    </footer>
  );
};

export const AppFooter = React.memo(AppFooterComponent);
