import 'react-toastify/dist/ReactToastify.css';

import { useContext } from 'react';
import { Bounce, ToastContainer as ReactoaTstifyContainer } from 'react-toastify';

import { DarkModeContext } from './DarkModeContext';

export const ToastContainer = () => {
  const { darkMode } = useContext(DarkModeContext);
  return (
    <ReactoaTstifyContainer
      position="top-right"
      autoClose={5000}
      hideProgressBar={false}
      newestOnTop={false}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme={darkMode ? 'dark' : 'light'}
      transition={Bounce}
    />
  );
};
