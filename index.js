import { Telegraf, Markup, session } from 'telegraf';
import 'dotenv/config';

const bot = new Telegraf(process.env.BOT_TOKEN);
bot.use(session());

const steps = ['fio', 'contact', 'company', 'description', 'confirm'];

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

  // Если ожидается контакт, а пришёл текст
  if (step === 'contact') {
    await ctx.reply('Пожалуйста, используйте кнопку «Отправить номер телефона» ниже, чтобы отправить свой номер.', Markup.keyboard([
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
    // Проверяем, что контакт был получен
    if (!ctx.session.contact) {
      ctx.session.step = 1; // возвращаемся к шагу контакта
      await ctx.reply('Пожалуйста, отправьте ваш номер телефона кнопкой ниже:', Markup.keyboard([
        Markup.button.contactRequest('Отправить номер телефона')
      ]).oneTime().resize());
      return;
    }
    ctx.session.step++;
    // Показываем кнопку "Отправить заявку"
    const summary = `Проверьте заявку перед отправкой:\n\n📝 Новая корпоративная заявка\n\n👤 ФИО: ${ctx.session.fio}\n🏢 Компания: ${ctx.session.company}\n✉️ Контакт: ${ctx.session.contact}\n💬 Комментарий: ${ctx.session.description}`;
    await ctx.reply(summary, Markup.keyboard([
      ['Отправить заявку']
    ]).oneTime().resize());
    return;
  }

  if (step === 'confirm') {
    if (ctx.message.text && ctx.message.text.trim().toLowerCase() === 'отправить заявку') {
      const msg = `📝 Новая корпоративная заявка\n\n👤 ФИО: ${ctx.session.fio}\n🏢 Компания: ${ctx.session.company}\n✉️ Контакт: ${ctx.session.contact}\n💬 Комментарий: ${ctx.session.description}`;
      try {
        await ctx.telegram.sendMessage(process.env.MANAGER_CHAT_ID, msg);
        await ctx.reply('Спасибо, наш менеджер свяжется с Вами в самое ближайшее время', Markup.removeKeyboard());
      } catch (e) {
        await ctx.reply('Ошибка при отправке заявки. Пожалуйста, попробуйте позже.');
      }
      ctx.session = null;
    } else {
      await ctx.reply('Пожалуйста, нажмите кнопку "Отправить заявку" для завершения.');
    }
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