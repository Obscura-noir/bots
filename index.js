import { Telegraf, Markup, session } from 'telegraf';
import 'dotenv/config';

const bot = new Telegraf(process.env.BOT_TOKEN);
bot.use(session());

const steps = ['fio', 'contact', 'company', 'description'];

bot.start(async (ctx) => {
  ctx.session = {};
  await ctx.reply('Привет! Давайте оформим заявку на платеж.\nПожалуйста, введите ваше ФИО:');
  ctx.session.step = 0;
});

bot.on('text', async (ctx) => {
  if (!ctx.session || ctx.session.step === undefined) return;
  const step = steps[ctx.session.step];

  if (step === 'fio') {
    ctx.session.fio = ctx.message.text;
    ctx.session.step++;
    await ctx.reply('Пожалуйста, отправьте ваш номер телефона кнопкой ниже:', Markup.keyboard([
      Markup.button.contactRequest('Отправить номер телефона')
    ]).oneTime().resize());
    return;
  }

  if (step === 'company') {
    ctx.session.company = ctx.message.text;
    ctx.session.step++;
    await ctx.reply('Опишите, пожалуйста, назначение платежа:');
    return;
  }

  if (step === 'description') {
    ctx.session.description = ctx.message.text;
    // Формируем заявку
    const msg = `📝 Новая корпоративная заявка\n\n👤 ФИО: ${ctx.session.fio}\n🏢 Компания: ${ctx.session.company}\n✉️ Контакт: ${ctx.session.contact}\n💬 Комментарий: ${ctx.session.description}`;
    // Отправляем менеджеру
    await ctx.telegram.sendMessage(process.env.MANAGER_CHAT_ID, msg);
    await ctx.reply('Спасибо! Ваша заявка отправлена.');
    ctx.session = null;
    return;
  }
});

bot.on('contact', async (ctx) => {
  if (!ctx.session || steps[ctx.session.step] !== 'contact') return;
  ctx.session.contact = ctx.message.contact.phone_number;
  ctx.session.step++;
  await ctx.reply('Введите название вашей компании:', Markup.removeKeyboard());
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM')); 