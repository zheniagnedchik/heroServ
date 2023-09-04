const express = require("express");
const { DocumentStore, IndexDefinition, FieldIndexing } = require("ravendb");
const bcrypt = require("bcrypt");
const jwt = require("node-jsonwebtoken");
const User = require("./models/user");
const multer = require("multer"); // Библиотека для обработки мультипарт-форм
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");

const app = express();

app.use("/thumbnails", express.static(path.join(__dirname, "thumbnails")));
app.use("/avatar", express.static(path.join(__dirname, "avatar")));
app.use("/photo", express.static(path.join(__dirname, "photo")));
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
      thumbnails,
      avatar,
      about,
      userName,
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
      thumbnails,
      avatar,
      about,
      userName
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
        thumbnails,
        avatar,
        about,
        userName,
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
async function saveUser(user) {
  const session = store.openSession();
  await session.store(user);
  await session.saveChanges();
}
async function findUserByEmail(email) {
  const session = store.openSession();
  const user = await session
    .query(User)
    .whereEquals("email", email)
    .firstOrNull();
  return user;
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const name = file.originalname;
    const testName = name.split("_");
    console.log("user", testName);
    cb(null, testName[0]);
  },
  filename: (req, file, cb) => {
    const name = file.originalname;
    const testName = name.split("_");
    console.log("user", testName);
    cb(null, testName[1]);
  },
});
async function generateVideoThumbnail(
  videoPath,
  thumbnailPath,
  thumbnailFileName
) {
  const vi = videoPath;
  const thumbnail = thumbnailPath;
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .on("end", () => resolve(thumbnailPath))
      .on("error", (err) => reject(err))
      .screenshots({
        timestamps: ["00:00:01"], // Время получения обложки (1 секунда)
        filename: thumbnailFileName,
        folder: thumbnailPath,
      });
  });
}
const upload = multer({ storage: storage });
app.post("/upload", upload.single("file"), async (req, res) => {
  console.log(req);
  try {
    const { email, folder, type } = req.body; // Email пользователя
    const user = await findUserByEmail(email);
    console.log("user", user);
    if (user) {
      const name = req.file.originalname;
      const testName = name.split("_");
      const fileUri = path.join(folder, testName[1]);
      if (folder === "photo") {
        if (type === "video") {
          const thumbnailFileName = `${testName[1]}.jpg`;
          const thumbnailUri = path.join(folder, thumbnailFileName);
          const videoPath = req.file.path; // Путь к загруженному видео
          const thumbnailPath = path.join(__dirname, folder); // Папка для сохранения обложки
          const thumbnailFullPath = path.join(thumbnailPath, thumbnailFileName);
          try {
            await generateVideoThumbnail(
              videoPath,
              thumbnailPath,
              thumbnailFileName
            );
            user.photo.push({
              uri: path.join(folder, testName[1]),
              type: "video",
              thumbnail: thumbnailUri,
            });

            console.log(
              "Файл и обложка успешно загружены и путь сохранен в базе данных."
            );
            res.json({
              uri: path.join(folder, testName[1]),
              type: "video",
              thumbnail: thumbnailUri,
            });
          } catch (error) {
            console.error(error);
            res
              .status(500)
              .json({ error: "Ошибка при создании обложки видео." });
          }
        } else {
          user.photo.push({
            uri: path.join(folder, testName[1]),
            type: "photo",
          });
        }
      } else {
        user[folder] = path.join(folder, testName[1]);
      }

      await saveUser(user);
      res.json({
        message: "Изображение успешно загружено и путь сохранен в базе данных.",
      });
    } else {
      console.log("Пользователь не найден.");
      res.status(404).json({ error: "Пользователь не найден." });
    }
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Произошла ошибка при обновлении пути в базе данных." });
  }
});
app.post("/add-about", async (req, res) => {
  try {
    const { email, about } = req.body;
    const user = await findUserByEmail(email);

    if (user) {
      user.about = about;
      await saveUser(user);
      res.status(200).json({ message: "информация о пользователе добавлена" });
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

app.get("/users", async (req, res) => {
  console.log("users");
  const session = store.openSession();
  try {
    const users = await session.query({ collection: "Users" }).all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "An error occurred" });
  }
});
app.get("/search_users", async (req, res) => {
  const queryTerm = req.query.userName;

  if (!queryTerm) {
    return res.status(400).send("Parameter 'userName' is required.");
  }

  try {
    const session = store.openSession();
    const results = await session
      .query({ indexName: "Users_ByCertainFields" })
      .search("UserName", `*${queryTerm}*`) // Используем wildcard поиск
      .all();

    res.json(results);
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Server error.");
  }
});
app.post("/get_user", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Не указан email." });
  }
  const session = store.openSession();
  try {
    // Выполняем запрос для получения пользователя по email
    const user = await session
      .query({ collection: "Users" })
      .whereEquals("email", email)
      .firstOrNull();

    if (user) {
      res.json(user);
    } else {
      res
        .status(404)
        .json({ message: "Пользователь с таким email не найден." });
    }
  } catch (err) {
    res.status(500).json({ message: "Ошибка при получении пользователя." });
  }
});
app.post("/api/subscribe", async (req, res) => {
  const { userId, targetUserId } = req.body;

  try {
    const session = store.openSession();
    const user = await session.load(userId);
    const targetUser = await session.load(targetUserId);
    user.subscriptions.push(targetUserId);
    targetUser.subscribers.push(userId);
    await session.saveChanges();
    res.json({ message: "Subscribed successfully" });
  } catch (error) {
    res.status(500).json({ error: "An error occurred" });
  }
});
app.post("/add_client", async (req, res) => {
  const { userId, targetUserId } = req.body;

  try {
    const session = store.openSession();
    const user = await session.load(userId);
    const targetUser = await session.load(targetUserId);
    user.clients.push(targetUserId);
    targetUser.treners.push(userId);
    await session.saveChanges();
    res.json({ message: "Subscribed successfully" });
  } catch (error) {
    res.status(500).json({ error: "An error occurred" });
  }
});
app.post("/remove_client", async (req, res) => {
  const { userId, targetUserId } = req.body;

  try {
    const session = store.openSession();
    const user = await session.load(userId);
    const targetUser = await session.load(targetUserId);
    // Удаление из списка подписок и подписчиков
    user.clients = user.clients.filter((id) => id !== targetUserId);
    targetUser.treners = targetUser.treners.filter((id) => id !== userId);
    await session.saveChanges();
    res.json({ message: "Unsubscribed successfully" });
  } catch (error) {
    res.status(500).json({ error: "An error occurred" });
  }
});
app.post("/api/unsubscribe", async (req, res) => {
  const { userId, targetUserId } = req.body;

  try {
    const session = store.openSession();
    const user = await session.load(userId);
    const targetUser = await session.load(targetUserId);

    // Удаление из списка подписок и подписчиков
    user.subscriptions = user.subscriptions.filter((id) => id !== targetUserId);
    targetUser.subscribers = targetUser.subscribers.filter(
      (id) => id !== userId
    );
    await session.saveChanges();
    res.json({ message: "Unsubscribed successfully" });
  } catch (error) {
    res.status(500).json({ error: "An error occurred" });
  }
});
app.post("/api/subscriptions", async (req, res) => {
  const { userId } = req.body;
  try {
    const session = store.openSession();
    const user = await session.load(userId);
    res.json({ subscriptions: user.subscriptions });
  } catch (error) {
    res.status(500).json({ error: "An error occurred" });
  }
});
app.post("/api/users/batch", async (req, res) => {
  const { userIds } = req.body;

  try {
    const session = store.openSession();

    // Подразумевается, что у вас есть индекс, индексирующий документы пользователей по Id
    const users = await session
      .query({ collection: "Users" })
      .whereIn("id", userIds)
      .selectFields(["userName", "avatar", "id", "role", "email"])
      .all();

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "An error occurred" });
  }
});
app.post("/api/users/batch_events", async (req, res) => {
  const { userIds } = req.body;

  try {
    const session = store.openSession();

    // Подразумевается, что у вас есть индекс, индексирующий документы пользователей по Id
    const users = await session
      .query({ collection: "Users" })
      .whereIn("id", userIds)
      .selectFields([
        "userName",
        "avatar",
        "id",
        "role",
        "email",
        "events",
        "eat",
      ])
      .all();

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "An error occurred" });
  }
});
app.post("/add_event", async (req, res) => {
  const { userId, eventDescription } = req.body;
  try {
    const session = store.openSession();
    const user = await session.load(userId);
    if (!user) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }
    user.events.push(eventDescription);
    await session.saveChanges();
    return res.json({ message: "Объект добавлен в поле events пользователя." });
  } catch (error) {
    console.error("Произошла ошибка:", error);
    return res.status(500).json({ message: "Произошла ошибка на сервере" });
  }
});
app.post("/add_eat", async (req, res) => {
  const { userId, eat } = req.body;
  try {
    const session = store.openSession();
    const user = await session.load(userId);
    if (!user) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }
    user.eat.push(eat);
    await session.saveChanges();
    return res.json({ message: "Объект добавлен в поле events пользователя." });
  } catch (error) {
    console.error("Произошла ошибка:", error);
    return res.status(500).json({ message: "Произошла ошибка на сервере" });
  }
});
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
