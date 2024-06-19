import { SettingsButton } from '@components/settings/SettingsButton';

export const Navbar = () => {
  const goHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="navbar bg-base-100 px-0 pt-0 min-h-[auto]">
      <div className="flex-1">
        <a className="btn btn-ghost text-xl" onClick={goHome}>
          💻👨‍✈️ Code Pilot
        </a>
      </div>
      <div className="flex-none">
        <ul className="menu menu-horizontal px-1">
          <li>
            <SettingsButton />
          </li>
        </ul>
      </div>
    </div>
  );
};
