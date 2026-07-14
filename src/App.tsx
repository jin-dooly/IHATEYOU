import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import "./App.css";
import Home from "./pages/Home";
import CharacterRoom from "./pages/CharacterRoom";

function App() {
  return (
    <BrowserRouter>
      <nav>
        <Link to="/characters">홈</Link>
        <Link to="/characters/1/room">character 1</Link>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/characters" element={<Home />} />
        <Route path="/characters/create" element={<Home />} />
        <Route path="/characters/:id/room" element={<CharacterRoom />} />
        <Route path="/characters/:id/edit" element={<CharacterRoom />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
