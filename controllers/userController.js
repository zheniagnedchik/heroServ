const { DocumentStore } = require("ravendb");
const bcrypt = require("bcrypt");
const jwt = require("node-jsonwebtoken");
const User = require("../models/user");
const ffmpeg = require("fluent-ffmpeg");
const multer = require("multer");
const store = new DocumentStore("http://64.226.88.96:8080", "Users");
store.initialize();
const path = require("path");

exports.register = async (req, res) => {
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
      subscriptions,
      subscribers,
      events,
      eat,
      clients,
      treners,
      nikName,
      place,
      typeGym,
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
      services,
      age,
      thumbnails,
      avatar,
      about,
      userName,
      subscriptions,
      subscribers,
      events,
      eat,
      clients,
      treners,
      nikName,
      place,
      typeGym
    );

    await session.store(newUser);
    await session.saveChanges();

    // Генерация и выдача JWT токена
    const token = jwt.sign({ email }, "secret_key");
    res.status(201).json({
      token: token,
      message: "User registered successfully",

      user: {
        email,
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
        subscriptions,
        subscribers,
        events,
        eat,
        clients,
        treners,
        id: newUser.id,
        nikName,
        place,
        typeGym,
      },
    });
  } catch (error) {
    console.error("Error registering user:", error);
    res
      .status(500)
      .json({ error: "Произошла ошибка при регистрации пользователя" });
  }
};
exports.login = async (req, res) => {
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
};
exports.addService = async (req, res) => {
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
};
exports.updateService = async (req, res) => {
  try {
    const { email, service } = req.body;

    if (!service.id) {
      return res
        .status(400)
        .json({ error: "Не предоставлен ID услуги для обновления" });
    }

    const session = store.openSession();
    const user = await session
      .query({ collection: "Users" })
      .whereEquals("email", email)
      .firstOrNull();

    if (user) {
      const serviceIndex = user.services.findIndex((s) => s.id === service.id);

      if (serviceIndex !== -1) {
        user.services[serviceIndex] = service; // Обновляем услугу
        await session.saveChanges();
        res.status(200).json({
          message: `Сервис обновлен для пользователя с email ${email}`,
        });
      } else {
        res.status(404).json({
          error: `Услуга с ID ${service.id} не найдена для пользователя с email ${email}`,
        });
      }
    } else {
      res
        .status(404)
        .json({ error: `Пользователь с email ${email} не найден` });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Произошла ошибка сервера" });
  }
};
exports.getUser = async (req, res) => {
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
};
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

exports.uploudFile = async (req, res) => {
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
};
exports.addAbout = async (req, res) => {
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
};
exports.changeUserName = async (req, res) => {
  try {
    const { email, userName } = req.body;
    const user = await findUserByEmail(email);
    if (user) {
      user.userName = userName;
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
};
exports.changeNikName = async (req, res) => {
  try {
    const { email, nikName } = req.body;
    const user = await findUserByEmail(email);
    if (user) {
      user.nikName = nikName;
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
};
exports.users = async (req, res) => {
  console.log("users");
  const session = store.openSession();

  try {
    let query = session.query({ collection: "Users" });

    // Проверяем, определены ли параметры фильтрации, и добавляем их в запрос
    if (req.query.typeGym !== "undefined") {
      console.log(
        "🚀 ~ file: userController.js:395 ~ exports.users= ~ req.query.typeGym:",
        req.query.typeGym
      );
      query = query.whereEquals("typeGym", req.query.typeGym);
    }
    if (req.query.gender !== "undefined") {
      query = query.whereEquals("gender", req.query.gender);
    }
    if (req.query.placeId !== "undefined") {
      query = query.whereEquals("place.id", req.query.placeId);
    }

    const users = await query.all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "An error occurred" });
  }
};
exports.findNearest = async (req, res) => {
  const { latitude, longitude } = req.body;
  if (!latitude || !longitude) {
    return res.status(400).send("Latitude and longitude are required.");
  }

  const myLatitude = parseFloat(latitude);
  const myLongitude = parseFloat(longitude);

  let session = store.openSession();
  try {
    let users = await session
      .query({ collection: "Users" })
      .whereExists("place")
      .all();

    let nearestUserData = null;
    let shortestDistance = Infinity;

    users.forEach((user) => {
      if (user.place && user.place.latitude && user.place.longitude) {
        let distance = calculateDistance(
          myLatitude,
          myLongitude,
          parseFloat(user.place.latitude),
          parseFloat(user.place.longitude)
        );
        if (distance < shortestDistance) {
          shortestDistance = distance;
          nearestUserData = { user, distance };
        }
      }
    });

    res.json(nearestUserData);
  } catch (e) {
    console.error(e);
    res.status(500).send("Internal Server Error");
  }
};

function calculateDistance(lat1, lon1, lat2, lon2) {
  // Функция для вычисления расстояния между двумя точками
  const R = 6371; // радиус Земли в километрах
  const dLat = degreesToRadians(lat2 - lat1);
  const dLon = degreesToRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degreesToRadians(lat1)) *
      Math.cos(degreesToRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function degreesToRadians(degrees) {
  return degrees * (Math.PI / 180);
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  // Функция для вычисления расстояния между двумя точками
  // Используем формулу гаверсинуса
  const R = 6371; // радиус Земли в километрах
  const dLat = degreesToRadians(lat2 - lat1);
  const dLon = degreesToRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degreesToRadians(lat1)) *
      Math.cos(degreesToRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function degreesToRadians(degrees) {
  return degrees * (Math.PI / 180);
}
exports.searchUsers = async (req, res) => {
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
};
exports.getUserq = async (req, res) => {
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
};
exports.subscribe = async (req, res) => {
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
};
exports.addClient = async (req, res) => {
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
};
exports.removeClient = async (req, res) => {
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
};
exports.unsubscribe = async (req, res) => {
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
};
exports.subscriptions = async (req, res) => {
  const { userId } = req.body;
  try {
    const session = store.openSession();
    const user = await session.load(userId);
    res.json({ subscriptions: user.subscriptions });
  } catch (error) {
    res.status(500).json({ error: "An error occurred" });
  }
};
exports.butch = async (req, res) => {
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
};
exports.butchEvents = async (req, res) => {
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
};
exports.addEvents = async (req, res) => {
  const { userId, eventDescription } = req.body;
  try {
    const session = store.openSession();
    const user = await session.load(userId);
    if (!user) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }
    user.events = [...user.events, ...eventDescription];
    await session.saveChanges();
    return res.json({ message: "Объект добавлен в поле events пользователя." });
  } catch (error) {
    console.error("Произошла ошибка:", error);
    return res.status(500).json({ message: "Произошла ошибка на сервере" });
  }
};
exports.addActiveEvents = async (req, res) => {
  const { userId, eventDescription } = req.body;
  try {
    const session = store.openSession();
    const user = await session.load(userId);
    if (!user) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    // Находим индекс объекта с таким же ID, если он есть
    const index = user.activeEvents.findIndex(
      (event) => event.id === eventDescription.id
    );

    if (index !== -1) {
      // Если объект с таким ID уже существует, то заменяем его
      user.activeEvents[index] = eventDescription;
    } else {
      // В противном случае добавляем новый объект
      user.activeEvents.push(eventDescription);
    }

    await session.saveChanges();
    return res.json({
      message: "Объект добавлен или обновлен в поле events пользователя.",
    });
  } catch (error) {
    console.error("Произошла ошибка:", error);
    return res.status(500).json({ message: "Произошла ошибка на сервере" });
  }
};
exports.removeActiveEvent = async (req, res) => {
  const { userId, eventId } = req.body;
  console.log(
    "🚀 ~ file: userController.js:608 ~ exports.removeActiveEvent= ~ eventId:",
    eventId
  );

  try {
    const session = store.openSession();
    const user = await session.load(userId);

    if (!user) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    // Находим индекс объекта с таким же ID, если он есть
    const index = user.activeEvents.findIndex((event) => event.id === eventId);

    if (index !== -1) {
      // Если объект с таким ID найден, удаляем его
      user.activeEvents.splice(index, 1);
    } else {
      // Если объект с таким ID не найден, отправляем соответствующий ответ
      return res.status(404).json({ message: "Событие не найдено" });
    }

    await session.saveChanges();
    return res.json({
      message: "Событие удалено из списка активных событий пользователя.",
    });
  } catch (error) {
    console.error("Произошла ошибка:", error);
    return res.status(500).json({ message: "Произошла ошибка на сервере" });
  }
};
exports.addEat = async (req, res) => {
  const { userId, eat } = req.body;
  try {
    const session = store.openSession();
    const user = await session.load(userId);
    if (!user) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }
    user.eat = [...user.eat, ...eat];
    await session.saveChanges();
    return res.json({ message: "Объект добавлен в поле events пользователя." });
  } catch (error) {
    console.error("Произошла ошибка:", error);
    return res.status(500).json({ message: "Произошла ошибка на сервере" });
  }
};
exports.getUserFromPlace = async (req, res) => {
  const { placeId } = req.body;

  if (isNaN(placeId)) {
    return res.status(400).send("Invalid place ID");
  }
  let session = store.openSession();
  try {
    const users = await session
      .query({ collection: "Users" })
      .whereEquals("place.id", placeId)
      .all();

    res.json(users);
  } catch (error) {
    console.error("Ошибка при запросе:", error);
    res.status(500).send("Internal Server Error");
  }
};
