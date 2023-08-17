const express = require("express");
const { DocumentStore } = require("ravendb");
const bcrypt = require("bcrypt");
const jwt = require("node-jsonwebtoken");
const User = require("./models/user");
const multer = require("multer"); // Библиотека для обработки мультипарт-форм
const path = require("path");

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
      age,
      thumbnail,
    } = req.body;
    console.log(req.body);
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
      services,
      age,
      thumbnail
    );
    await session.store(newUser);
    await session.saveChanges();

    // Генерация и выдача JWT токена
    const token = jwt.sign({ email }, "secret_key");
    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        email,
        hashedPassword,
        height,
        weight,
        gender,
        role,
        photo,
        video,
        services,
        age,
        thumbnail,
      },
    });
  } catch (error) {
    console.error("Error registering user:", error);
    res
      .status(500)
      .json({ error: "Произошла ошибка при регистрации пользователя" });
  }
});
app.post("/login", async (req, res) => {
  console.log("login");
  try {
    const { email, password } = req.body;
    console.log(email);
    console.log(password);
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
      return res.status(407).json({ error: "Неверный логин или пароль" });
    }
    // Генерация и выдача JWT токена
    const token = jwt.sign({ email }, "secret_key");
    res.json({ token, user });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ error: "Произошла ошибка при входе в систему" });
  }
});
app.post("/add-service", async (req, res) => {
  try {
    const { email, service } = req.body;

    const session = store.openSession();
    const user = await session
      .query({ collection: "Users" })
      .whereEquals("email", email)
      .firstOrNull();

    if (user) {
      user.services.push(service);
      await session.saveChanges();
      res
        .status(200)
        .json({ message: `Сервис добавлен пользователю с email ${email}` });
    } else {
      res
        .status(404)
        .json({ error: `Пользователь с email ${email} не найден` });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Произошла ошибка сервера" });
  }
});
app.post("/get-user", async (req, res) => {
  try {
    const { email } = req.body;

    const session = store.openSession();
    const user = await session
      .query({ collection: "Users" })
      .whereEquals("email", email)
      .firstOrNull();

    if (user) {
      res.status(200).json(user);
    } else {
      res
        .status(404)
        .json({ error: `Пользователь с email ${email} не найден` });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Произошла ошибка сервера" });
  }
});
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "thumbnails/"); // Путь для сохранения файлов
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname); // Имя сохраняемого файла
  },
});

const upload = multer({ storage: storage });
async function findUserByEmail(email) {
  const session = store.openSession();
  const user = await session
    .query(User)
    .whereEquals("email", email)
    .firstOrNull();
  return user;
}
async function saveUser(user) {
  const session = store.openSession();
  await session.store(user);
  await session.saveChanges();
}
app.post("/upload", upload.single("image"), async (req, res) => {
  console.log("🚀 ~ file: index.js:187 ~ app.post ~ req:", req.body);
  try {
    const { email } = req.body; // Email пользователя
    const user = await findUserByEmail(email);

    if (user) {
      user.thumbnail = path.join("thumbnails", req.file.originalname);
      await saveUser(user);
      res.json({
        message: "Изображение успешно загружено и путь сохранен в базе данных.",
      });
    } else {
      res.status(404).json({ error: "Пользователь не найден." });
    }
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Произошла ошибка при обновлении пути в базе данных." });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
