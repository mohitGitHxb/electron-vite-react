import { useEffect, useState } from "react";
import UpdateElectron from "@/components/update";
import logoVite from "./assets/logo-vite.svg";
import logoElectron from "./assets/logo-electron.svg";
import "./App.css";
import { timeStamp } from "node:console";

function App() {
  const [count, setCount] = useState(0);
  const [data, setData] = useState({
    timeStamp: new Date().toLocaleString(),
    avg_order_value: 0,
    total_order_count: 0,
    total_products: 0,
    total_users: 0,
  });

  useEffect(() => {
    let timer = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/stats`);
        if (response.ok) {
          const received = await response.json();
          console.log("received", received);
          setData({
            timeStamp: new Date().toLocaleString(),
            avg_order_value: received?.avg_order_value,
            total_order_count: received?.total_order_count,
            total_products: received?.total_products,
            total_users: received?.total_users,
          });
        }
      } catch (error) {
        console.error(error);
      }
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="App">
      <div className="logo-box">
        <a
          href="https://github.com/electron-vite/electron-vite-react"
          target="_blank"
        >
          <img
            src={logoVite}
            className="logo vite"
            alt="Electron + Vite logo"
          />
          <img
            src={logoElectron}
            className="logo electron"
            alt="Electron + Vite logo"
          />
        </a>
      </div>
      <h1>Electron + Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Electron + Vite logo to learn more
      </p>
      <div className="flex-center">
        Place static files into the<code>/public</code> folder{" "}
        <img style={{ width: "5em" }} src="./node.svg" alt="Node logo" />
      </div>
      <div className="flex flex-col flex-center bg-neutral-800 border border-blue-200 rounded-lg">
        <h1>Received data from running python backend</h1>
        <p>timeStamp: {data.timeStamp}</p>
        <p>avg_order_value: {data.avg_order_value}</p>
        <p>total_order_count: {data.total_order_count}</p>
        <p>total_products: {data.total_products}</p>
      </div>
      <UpdateElectron />
    </div>
  );
}

export default App;
