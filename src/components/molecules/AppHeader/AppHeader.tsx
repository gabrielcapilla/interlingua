interface AppHeaderProps {
  title: string;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ title }) => (
  <header className="app-header">
    <h1 className="app-header_title">{title}</h1>
  </header>
);
