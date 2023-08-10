const express = require("express");
const { DocumentStore } = require("ravendb");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("./models/user");

const app = express();
const port = 3000;
app.use(express.json());

const store = new DocumentStore("http://64.226.88.96:8080", "Users");
store.initialize();

app.get("/", async (req, res) => {
  res.send("hello");
});

app.post("/register", async (req, res) => {
  try {
    const {
      email,
      password,
      height,
      weight,
      gender,
      role,
      photo,
      video,
      services,
    } = req.body;

    const session = store.openSession();
    const existingUser = await session
      .query(User)
      .whereEquals("email", email)
      .firstOrNull();

    if (existingUser) {
      return res
        .status(400)
        .json({ error: "Такой пользователь уже существует" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User(
      email,
      hashedPassword,
      height,
      weight,
      gender,
      role,
      photo,
      video,
      services
    );
    await session.store(newUser);
    await session.saveChanges();

    // Генерация и выдача JWT токена
    const token = jwt.sign({ email }, "secret_key");
    res.status(201).json({ message: "User registered successfully", token });
  } catch (error) {
    console.error("Error registering user:", error);
    res
      .status(500)
      .json({ error: "Произошла ошибка при регистрации пользователя" });
  }
});
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const session = store.openSession();
    const user = await session
      .query(User)
      .whereEquals("email", email)
      .firstOrNull();

    if (!user) {
      return res.status(401).json({ error: "Неверный логин или пароль" });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Неверный логин или пароль" });
    }

    // Генерация и выдача JWT токена
    const token = jwt.sign({ email }, "secret_key");
    res.json({ token });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ error: "Произошла ошибка при входе в систему" });
  }
});
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
