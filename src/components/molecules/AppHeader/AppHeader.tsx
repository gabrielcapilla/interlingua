import React from 'react';

interface AppHeaderProps {
  title: string;
}

/**
 * @description Renders the main header for the application. It consistently displays the application's title.
 * @param {AppHeaderProps} props The props for the component.
 * @param {string} props.title The text to display as the main title in the header.
 * @returns {React.ReactElement} The rendered application header component.
 * @interactions
 * - **CSS:** Relies on the `.app-header` and `.app-header__title` classes in `index.css` for its layout and styling.
 * - **Parent Component:** Rendered by `TranslationPage` to provide a consistent top-level navigation bar.
 */
export const AppHeader: React.FC<AppHeaderProps> = ({ title }) => {
  return (
    <header className="app-header">
      <h1 className="app-header__title">{title}</h1>
    </header>
  );
};
