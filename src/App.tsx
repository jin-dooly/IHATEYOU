import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import Home from "./pages/Home";
import CharacterCreate from "./pages/CharacterCreate";
import CharacterEdit from "./pages/CharacterEdit";
import CharacterRoom from "./pages/CharacterRoom";
import CharacterStats from "./pages/CharacterStats";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/characters" element={<Home />} />
        <Route path="/characters/create" element={<CharacterCreate />} />
        <Route path="/characters/:id/edit" element={<CharacterEdit />} />
        <Route path="/characters/:id/room" element={<CharacterRoom />} />
        <Route path="/characters/:id/stats" element={<CharacterStats />} />
        <Route path="/*" element={<Navigate to="/characters" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
