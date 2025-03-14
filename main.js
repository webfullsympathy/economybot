import mysql from 'mysql2/promise';
import { Client, GatewayIntentBits, SlashCommandBuilder } from 'discord.js';
import { config } from 'dotenv';

// .env ファイルの読み込み
config();

// DB設定
const connection = await mysql.createConnection({
  host: process.env.DB_HOST,       // データベースホスト
  user: process.env.DB_USER,       // MariaDBのユーザー名
  password: process.env.DB_PASSWORD, // MariaDBのパスワード
  database: process.env.DB_NAME    // 使用するデータベース名
});

// セットアップ
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// メッセージ送信のやつ
client.on('messageCreate', async (message) => {
  // BOTのメッセージには反応しない
  if (message.author.bot) return;

  const user = {
    username: message.author.username,
    message: message.content
  };

  await addCurrencyForGreeting(user, message);
});

// 挨拶で追加
async function addCurrencyForGreeting(user, message) {
  const greetings = ['こんばんは', 'おはよう', 'こんにちは', 'ちゃ', ':tya:'];

  // 挨拶があった場合
  if (greetings.includes(user.message)) {
    const [result] = await connection.execute(
      'UPDATE users SET balance = balance + 1 WHERE username = ?',
      [user.username]
    );

    // メッセージ送信
    message.channel.send(`<@${message.author.id}> さんが挨拶で通貨1を獲得しました！`);
  }
}

// リアクションで追加
async function addCurrencyForReactions(user, reactionCount, message) {
  if (reactionCount >= 10) {
    // リアクションが10以上で通貨追加
    const [result] = await connection.execute(
      'UPDATE users SET balance = balance + 1 WHERE username = ?',
      [user.username]
    );

    // メッセージ送信
    message.channel.send(`<@${message.author.id}> さんが10リアクションで通貨1を獲得しました！`);
  }
}

// 残高を取得
async function getUserBalance(username) {
  const [rows] = await connection.execute(
    'SELECT balance FROM users WHERE username = ?',
    [username]
  );
  return rows[0] ? rows[0].balance : 0;
}

// 店作成
async function createShop(user, shopName, message) {
  const [result] = await connection.execute(
    'INSERT INTO shops (username, shop_name) VALUES (?, ?)',
    [user.username, shopName]
  );

  // メッセージ送信
  message.channel.send(`<@${message.author.id}> さんがショップ「${shopName}」を作成しました！`);
}


// 売り物追加
async function addItemToShop(shopName, itemName, price, message) {
  const [result] = await connection.execute(
    'INSERT INTO shop_items (shop_name, item_name, price) VALUES (?, ?, ?)',
    [shopName, itemName, price]
  );

  // メッセージ送信
  message.channel.send(`ショップ「${shopName}」にアイテム「${itemName}」を追加しました！`);
}

// 売り物削除
async function removeItemFromShop(shopName, itemName, message) {
  const [result] = await connection.execute(
    'DELETE FROM shop_items WHERE shop_name = ? AND item_name = ?',
    [shopName, itemName]
  );

  // メッセージ送信
  message.channel.send(`ショップ「${shopName}」からアイテム「${itemName}」を削除しました！`);
}

// ログイン
client.login(process.env.TOKEN);


// コマンド設定
client.once('ready', async () => {
  const guildId = process.env.GUILD_ID;

  if (guildId) {
    // GUILD_IDが設定されていればギルドコマンドを設定
    const guild = client.guilds.cache.get(guildId);

    if (!guild) {
      console.log("指定されたギルドが見つかりません。");
      return;
    }

    console.log(`ギルド${guild.name}にコマンドを登録します`);

    // コマンド作成
    const commands = [
      new SlashCommandBuilder().setName('greet').setDescription('挨拶のコマンド'),
      new SlashCommandBuilder().setName('shop').setDescription('ショップ関連のコマンド')
    ];

    await guild.commands.set(commands);
    console.log("ギルドコマンドの登録が完了しました");
  } else {
    // GUILDが登録されてなければグローバルコマンドを設定
    console.log("グローバルコマンドを登録します");

    // コマンド作成
    const commands = [
      new SlashCommandBuilder()
      .setName('greet')
      .setDescription('挨拶のコマンド'),

      new SlashCommandBuilder()
      .setName('shop')
      .setDescription('ショップ関連のコマンド')
    ];

    await client.application.commands.set(commands);
    console.log("グローバルコマンドの登録が完了しました");
  }
});

