import type { Locale } from './site';

export interface BoardText {
  title: string;
  day: string;
  today: string;
  from: string;
  length: string;
  hoursShort: string;
  stations: string;
  free: string;
  taken: string;
  until: string;
  selected: string;
  loading: string;
  loadFailed: string;
  retry: string;
  name: string;
  phone: string;
  submit: string;
  sending: string;
  privacy: string;
  pickStation: string;
  needName: string;
  needPhone: string;
  doneTitle: string;
  doneBody: string;
  another: string;
  errConflict: string;
  errPast: string;
  errTooMany: string;
  errRate: string;
  errGeneric: string;
  closed: string;
}

export interface Content {
  metaTitle: string;
  metaDescription: string;
  nav: { book: string; floor: string; booking: string; features: string; contact: string; signIn: string; language: string };
  hero: { title: string; body: string; owner: string };
  board: BoardText;
  floor: { title: string; body: string; videoLabel: string; points: string[] };
  booking: { title: string; body: string; videoLabel: string; steps: [string, string][]; limits: string };
  kiosk: { title: string; body: string; alt: string; points: string[] };
  features: { title: string; items: [string, string][] };
  gallery: { title: string; shots: { file: string; caption: string; alt: string }[] };
  faq: { title: string; items: [string, string][] };
  contact: { title: string; body: string; call: string; email: string };
  footer: { demo: string; rights: string };
  consent: { body: string; accept: string; decline: string };
  videoFallback: string;
}

const en: Content = {
  metaTitle: 'Game Room Manage: gaming cafe software with online booking',
  metaDescription:
    'Gaming cafe management software for PC time, kiosk control, reports and online booking across PCs and consoles. See it working and book a station.',
  nav: { book: 'Book', floor: 'Live floor', booking: 'Bookings', features: 'Features', contact: 'Contact', signIn: 'Sign in', language: 'Language' },
  hero: {
    title: 'Every station, on time.',
    body: 'Game Room Manage runs PC time, kiosks and bookings for your gaming cafe from one screen. This board is live: reserve a station and the request lands in the club calendar.',
    owner: 'Own a club? Talk to us',
  },
  board: {
    title: 'Book a station',
    day: 'Day',
    today: 'Today',
    from: 'From',
    length: 'For',
    hoursShort: 'h',
    stations: 'Choose stations',
    free: 'Free',
    taken: 'Taken',
    until: 'until {time}',
    selected: 'Selected',
    loading: 'Checking the board…',
    loadFailed: 'The board could not load.',
    retry: 'Try again',
    name: 'Your name',
    phone: 'Phone',
    submit: 'Request booking',
    sending: 'Sending…',
    privacy: 'We use your name and phone only to confirm this booking.',
    pickStation: 'Choose at least one free station.',
    needName: 'Enter your name.',
    needPhone: 'Enter a valid phone number.',
    doneTitle: 'Request received',
    doneBody: '{stations}, {time}. The club holds this slot and will call you to confirm.',
    another: 'Book another',
    errConflict: 'Someone just took that slot. The board is updated, so pick another.',
    errPast: 'That time has already passed. Pick a later one.',
    errTooMany: 'There are already several unconfirmed requests. Please call us.',
    errRate: 'Too many attempts. Wait a minute and try again.',
    errGeneric: 'The request did not go through. Try again or call us.',
    closed: 'No more slots on this day. Pick another day.',
  },
  floor: {
    title: 'See the whole room without leaving the desk',
    body: 'Every PC shows who is playing, what they launched and how much time is left. Start, pause or end a session from the same card.',
    videoLabel: 'Video: starting and pausing a customer session on the live floor',
    points: ['Time is billed by the server, to the second', 'A paused session stops the clock and locks the PC', 'Alerts fire before a customer runs out of time'],
  },
  booking: {
    title: 'Bookings that arrive by themselves',
    body: 'Players reserve from this page, with no app or account. Staff see every request on a one-day calendar with all PCs and consoles from 14:00 to 02:00.',
    videoLabel: 'Video: confirming an online request and adding a booking on the calendar',
    steps: [
      ['The player picks a time', 'Day, start, length and one or more free stations.'],
      ['The slot is held', 'The request blocks those stations, so nobody can double-book them.'],
      ['Staff confirm', 'It appears in amber on the calendar. Call the player, then confirm or reject.'],
      ['The day stays clear', 'See exactly how many devices are busy in every half hour.'],
    ],
    limits: 'Online requests can be up to 6 hours long and made up to 60 days ahead.',
  },
  kiosk: {
    title: 'A kiosk on every PC, with the clock in charge',
    body: 'The Windows client fills the screen until a customer signs in, then shows their time and game library. When time runs out, the session ends on its own.',
    alt: 'Kiosk screen showing the remaining time and a game library',
    points: ['Full-screen lock for Windows 10 and 11', 'Launch Steam, EXE or link-based games', 'Small always-on-top timer while a game runs', 'Games close when the session ends'],
  },
  features: {
    title: 'What is on the timetable',
    items: [
      ['Customer time balances', 'Top up, deduct or set hours, with a full history for every customer.'],
      ['Live PC floor', 'Busy, free, offline and low-balance PCs on one screen.'],
      ['Remote control', 'End a session or shut down a PC from the admin panel.'],
      ['Booking calendar', 'Drag to book, with group bookings across PCs and consoles.'],
      ['Game catalog', 'Decide what appears on the kiosks and how each title launches.'],
      ['Reports', 'Sessions, usage, top-ups and deductions by day, customer and PC, with CSV export.'],
      ['Customer profile', 'Players can check their balance and history on the web.'],
      ['Staff languages', 'The admin panel and kiosk work in Georgian, English and Russian.'],
    ],
  },
  gallery: {
    title: 'The real product',
    shots: [
      { file: 'room.webp', caption: 'Live floor', alt: 'Dashboard with ten PC cards showing players, games and time left' },
      { file: 'calendar.webp', caption: 'Booking calendar', alt: 'One-day calendar with bookings across ten PCs and two consoles' },
      { file: 'reports.webp', caption: 'Reports', alt: 'Report with sessions, usage and top-ups by day' },
      { file: 'users.webp', caption: 'Customers', alt: 'Customer list with balances' },
      { file: 'games.webp', caption: 'Game catalog', alt: 'Game catalog with launch settings' },
    ],
  },
  faq: {
    title: 'Questions',
    items: [
      ['Do players need an account to book?', 'No. A name and a phone number are enough. The club calls to confirm.'],
      ['Can a slot be booked twice?', 'No. The server checks every request, and an unconfirmed request already holds its stations.'],
      ['Which devices does it manage?', 'PCs run the Windows kiosk with live time tracking. Consoles appear in the booking calendar.'],
      ['Which computers does the kiosk run on?', 'Windows 10 and Windows 11, 64-bit.'],
      ['Which languages does the software use?', 'The admin panel and kiosk are in Georgian, English and Russian. This website is also available in Turkish and German.'],
      ['How much does it cost?', 'Pricing depends on your club. Call or email us and we will walk you through it.'],
    ],
  },
  contact: {
    title: 'Run a club? Let’s talk.',
    body: 'Tell us how many stations you have. We will show you the system and answer your questions.',
    call: 'Call',
    email: 'Email',
  },
  footer: { demo: 'Screens and videos use made-up demo data.', rights: 'All rights reserved.' },
  consent: { body: 'May we use Google Analytics cookies to understand how this site is used?', accept: 'Allow', decline: 'Decline' },
  videoFallback: 'Your browser cannot play this video.',
};

const ka: Content = {
  metaTitle: 'Game Room Manage: გეიმ-კლუბის პროგრამა ონლაინ ჯავშნით',
  metaDescription:
    'გეიმ-კლუბის მართვის პროგრამა: PC-ების დრო, კიოსკი, რეპორტები და ონლაინ ჯავშანი კომპიუტერებსა და კონსოლებზე. ნახე მუშაობაში და დაჯავშნე ადგილი.',
  nav: { book: 'ჯავშანი', floor: 'დარბაზი', booking: 'ჯავშნები', features: 'ფუნქციები', contact: 'კონტაქტი', signIn: 'შესვლა', language: 'ენა' },
  hero: {
    title: 'ყველა ადგილი, თავის დროზე.',
    body: 'Game Room Manage ერთი ეკრანიდან მართავს შენი გეიმ-კლუბის PC-ების დროს, კიოსკებსა და ჯავშნებს. ეს დაფა ცოცხალია: დაჯავშნე ადგილი და მოთხოვნა კლუბის კალენდარში შევა.',
    owner: 'კლუბი გაქვს? დაგვიკავშირდი',
  },
  board: {
    title: 'დაჯავშნე ადგილი',
    day: 'დღე',
    today: 'დღეს',
    from: 'დან',
    length: 'ხანგრძლივობა',
    hoursShort: 'სთ',
    stations: 'აირჩიე ადგილები',
    free: 'თავისუფალი',
    taken: 'დაკავებული',
    until: '{time}-მდე',
    selected: 'არჩეული',
    loading: 'დაფა მოწმდება…',
    loadFailed: 'დაფა ვერ ჩაიტვირთა.',
    retry: 'თავიდან ცდა',
    name: 'შენი სახელი',
    phone: 'ტელეფონი',
    submit: 'ჯავშნის მოთხოვნა',
    sending: 'იგზავნება…',
    privacy: 'სახელსა და ტელეფონს მხოლოდ ამ ჯავშნის დასადასტურებლად ვიყენებთ.',
    pickStation: 'აირჩიე მინიმუმ ერთი თავისუფალი ადგილი.',
    needName: 'შეიყვანე სახელი.',
    needPhone: 'შეიყვანე სწორი ტელეფონის ნომერი.',
    doneTitle: 'მოთხოვნა მიღებულია',
    doneBody: '{stations}, {time}. კლუბი ამ დროს გინახავს და დასადასტურებლად დაგირეკავს.',
    another: 'კიდევ ერთი ჯავშანი',
    errConflict: 'ეს დრო ახლახან დაიკავეს. დაფა განახლდა, აირჩიე სხვა.',
    errPast: 'ეს დრო უკვე გავიდა. აირჩიე უფრო გვიანი.',
    errTooMany: 'უკვე რამდენიმე დაუდასტურებელი მოთხოვნაა. დაგვირეკე.',
    errRate: 'ძალიან ბევრი მცდელობაა. მოიცადე ერთი წუთი და სცადე თავიდან.',
    errGeneric: 'მოთხოვნა ვერ გაიგზავნა. სცადე თავიდან ან დაგვირეკე.',
    closed: 'ამ დღეს თავისუფალი დრო აღარ არის. აირჩიე სხვა დღე.',
  },
  floor: {
    title: 'მთელი დარბაზი მაგიდიდან ადგომის გარეშე',
    body: 'ყველა PC აჩვენებს, ვინ თამაშობს, რა გაუშვა და რამდენი დრო დარჩა. სესიას იმავე ბარათიდან იწყებ, აპაუზებ ან ასრულებ.',
    videoLabel: 'ვიდეო: მომხმარებლის სესიის დაწყება და დაპაუზება დარბაზის ეკრანზე',
    points: ['დროს სერვერი ითვლის, წამის სიზუსტით', 'პაუზაზე საათი ჩერდება და PC იკეტება', 'დროის ამოწურვამდე ადმინი შეტყობინებას იღებს'],
  },
  booking: {
    title: 'ჯავშნები, რომლებიც თავად შემოდის',
    body: 'მოთამაშე ჯავშნის ამ გვერდიდან, აპისა და ანგარიშის გარეშე. პერსონალი ყველა მოთხოვნას ხედავს ერთი დღის კალენდარზე, ყველა PC-ითა და კონსოლით, 14:00-დან 02:00-მდე.',
    videoLabel: 'ვიდეო: ონლაინ მოთხოვნის დადასტურება და ჯავშნის დამატება კალენდარში',
    steps: [
      ['მოთამაშე ირჩევს დროს', 'დღე, დაწყება, ხანგრძლივობა და ერთი ან რამდენიმე თავისუფალი ადგილი.'],
      ['დრო ინახება', 'მოთხოვნა ამ ადგილებს იკავებს, ამიტომ ორმაგი ჯავშანი შეუძლებელია.'],
      ['პერსონალი ადასტურებს', 'კალენდარში ქარვისფრად ჩნდება. დაურეკე მოთამაშეს და დაადასტურე ან უარყავი.'],
      ['დღე ნათელი რჩება', 'ყოველ ნახევარ საათში ზუსტად ჩანს, რამდენი მოწყობილობაა დაკავებული.'],
    ],
    limits: 'ონლაინ მოთხოვნა შეიძლება იყოს 6 საათამდე და გაკეთდეს 60 დღით ადრე.',
  },
  kiosk: {
    title: 'კიოსკი ყველა PC-ზე, სადაც საათი მართავს',
    body: 'Windows კლიენტი მთელ ეკრანს იკავებს, სანამ მომხმარებელი არ შევა, შემდეგ კი აჩვენებს მის დროსა და თამაშებს. დროის ამოწურვისას სესია თავად სრულდება.',
    alt: 'კიოსკის ეკრანი დარჩენილი დროითა და თამაშების ბიბლიოთეკით',
    points: ['სრულეკრანიანი ჩაკეტვა Windows 10-სა და 11-ზე', 'Steam, EXE და ბმულით გასაშვები თამაშები', 'პატარა ტაიმერი ყველა ფანჯრის ზემოთ თამაშის დროს', 'სესიის დასრულებისას თამაშები იხურება'],
  },
  features: {
    title: 'რა არის განრიგში',
    items: [
      ['მომხმარებლის დროის ბალანსი', 'შეავსე, ჩამოჭერი ან დააყენე საათები, სრული ისტორიით.'],
      ['ცოცხალი დარბაზი', 'დაკავებული, თავისუფალი, გამორთული და ბალანსდაბალი PC-ები ერთ ეკრანზე.'],
      ['დისტანციური მართვა', 'დაასრულე სესია ან გათიშე PC ადმინ პანელიდან.'],
      ['ჯავშნების კალენდარი', 'გადაათრიე დასაჯავშნად, ჯგუფური ჯავშნებით PC-ებსა და კონსოლებზე.'],
      ['თამაშების კატალოგი', 'შენ წყვეტ, რა გამოჩნდეს კიოსკზე და როგორ გაეშვას თითოეული თამაში.'],
      ['რეპორტები', 'სესიები, გამოყენება, შევსებები და ჩამოჭრები დღის, მომხმარებლისა და PC-ის მიხედვით, CSV ექსპორტით.'],
      ['მომხმარებლის პროფილი', 'მოთამაშეს შეუძლია ვებზე ნახოს ბალანსი და ისტორია.'],
      ['პერსონალის ენები', 'ადმინ პანელი და კიოსკი მუშაობს ქართულად, ინგლისურად და რუსულად.'],
    ],
  },
  gallery: {
    title: 'ნამდვილი პროდუქტი',
    shots: [
      { file: 'room.webp', caption: 'ცოცხალი დარბაზი', alt: 'დაშბორდი ათი PC-ის ბარათით: მოთამაშეები, თამაშები და დარჩენილი დრო' },
      { file: 'calendar.webp', caption: 'ჯავშნების კალენდარი', alt: 'ერთი დღის კალენდარი ჯავშნებით ათ PC-სა და ორ კონსოლზე' },
      { file: 'reports.webp', caption: 'რეპორტები', alt: 'რეპორტი სესიებით, გამოყენებითა და შევსებებით დღეების მიხედვით' },
      { file: 'users.webp', caption: 'მომხმარებლები', alt: 'მომხმარებლების სია ბალანსებით' },
      { file: 'games.webp', caption: 'თამაშების კატალოგი', alt: 'თამაშების კატალოგი გაშვების პარამეტრებით' },
    ],
  },
  faq: {
    title: 'კითხვები',
    items: [
      ['სჭირდება მოთამაშეს ანგარიში ჯავშნისთვის?', 'არა. საკმარისია სახელი და ტელეფონი. დასადასტურებლად კლუბი დაურეკავს.'],
      ['შეიძლება ერთი დრო ორჯერ დაიჯავშნოს?', 'არა. სერვერი ყველა მოთხოვნას ამოწმებს, დაუდასტურებელი მოთხოვნაც კი უკვე იკავებს ადგილებს.'],
      ['რომელ მოწყობილობებს მართავს?', 'PC-ებზე მუშაობს Windows კიოსკი დროის ცოცხალი აღრიცხვით. კონსოლები ჯავშნების კალენდარშია.'],
      ['რომელ კომპიუტერებზე მუშაობს კიოსკი?', 'Windows 10 და Windows 11, 64-ბიტიანი.'],
      ['რომელ ენებზეა პროგრამა?', 'ადმინ პანელი და კიოსკი ქართულად, ინგლისურად და რუსულადაა. ეს საიტი თურქულად და გერმანულადაც არის ხელმისაწვდომი.'],
      ['რა ღირს?', 'ფასი შენს კლუბზეა დამოკიდებული. დაგვირეკე ან მოგვწერე და ყველაფერს აგიხსნით.'],
    ],
  },
  contact: {
    title: 'გაქვს კლუბი? მოდი, ვისაუბროთ.',
    body: 'გვითხარი, რამდენი ადგილი გაქვს. გაჩვენებთ სისტემას და ყველა კითხვას ვუპასუხებთ.',
    call: 'დარეკვა',
    email: 'მეილი',
  },
  footer: { demo: 'ეკრანებსა და ვიდეოებში გამოგონილი სადემონსტრაციო მონაცემებია.', rights: 'ყველა უფლება დაცულია.' },
  consent: { body: 'შეგვიძლია გამოვიყენოთ Google Analytics-ის ქუქიები, რომ გავიგოთ, როგორ გამოიყენება საიტი?', accept: 'დაშვება', decline: 'უარი' },
  videoFallback: 'შენი ბრაუზერი ამ ვიდეოს ვერ უკრავს.',
};

const ru: Content = {
  metaTitle: 'Game Room Manage: программа для компьютерного клуба с онлайн-бронью',
  metaDescription:
    'Программа управления компьютерным клубом: время на PC, киоск, отчёты и онлайн-бронирование компьютеров и консолей. Посмотрите в работе и забронируйте место.',
  nav: { book: 'Бронь', floor: 'Зал', booking: 'Брони', features: 'Функции', contact: 'Контакты', signIn: 'Войти', language: 'Язык' },
  hero: {
    title: 'Каждое место вовремя.',
    body: 'Game Room Manage управляет временем на PC, киосками и бронями вашего компьютерного клуба с одного экрана. Это табло живое: забронируйте место, и заявка попадёт в календарь клуба.',
    owner: 'Есть клуб? Свяжитесь с нами',
  },
  board: {
    title: 'Забронировать место',
    day: 'День',
    today: 'Сегодня',
    from: 'С',
    length: 'На',
    hoursShort: 'ч',
    stations: 'Выберите места',
    free: 'Свободно',
    taken: 'Занято',
    until: 'до {time}',
    selected: 'Выбрано',
    loading: 'Проверяем табло…',
    loadFailed: 'Не удалось загрузить табло.',
    retry: 'Повторить',
    name: 'Ваше имя',
    phone: 'Телефон',
    submit: 'Отправить заявку',
    sending: 'Отправка…',
    privacy: 'Имя и телефон нужны только для подтверждения этой брони.',
    pickStation: 'Выберите хотя бы одно свободное место.',
    needName: 'Введите имя.',
    needPhone: 'Введите правильный номер телефона.',
    doneTitle: 'Заявка принята',
    doneBody: '{stations}, {time}. Клуб держит это время за вами и позвонит для подтверждения.',
    another: 'Ещё одна бронь',
    errConflict: 'Это время только что заняли. Табло обновлено, выберите другое.',
    errPast: 'Это время уже прошло. Выберите более позднее.',
    errTooMany: 'Уже есть несколько неподтверждённых заявок. Позвоните нам.',
    errRate: 'Слишком много попыток. Подождите минуту и повторите.',
    errGeneric: 'Заявка не отправилась. Повторите или позвоните нам.',
    closed: 'На этот день свободного времени нет. Выберите другой день.',
  },
  floor: {
    title: 'Весь зал видно, не вставая из-за стойки',
    body: 'Каждый PC показывает, кто играет, что запущено и сколько времени осталось. Начать, поставить на паузу или завершить сеанс можно в той же карточке.',
    videoLabel: 'Видео: запуск и пауза сеанса клиента на экране зала',
    points: ['Время считает сервер, с точностью до секунды', 'На паузе часы стоят, а PC заблокирован', 'Оповещение приходит до того, как время закончится'],
  },
  booking: {
    title: 'Брони, которые приходят сами',
    body: 'Игроки бронируют прямо на этой странице, без приложения и аккаунта. Персонал видит все заявки в календаре на день: все PC и консоли с 14:00 до 02:00.',
    videoLabel: 'Видео: подтверждение онлайн-заявки и добавление брони в календарь',
    steps: [
      ['Игрок выбирает время', 'День, начало, длительность и одно или несколько свободных мест.'],
      ['Время удерживается', 'Заявка занимает эти места, поэтому двойная бронь невозможна.'],
      ['Персонал подтверждает', 'Заявка появляется в календаре янтарным цветом. Позвоните игроку и подтвердите или отклоните.'],
      ['День как на ладони', 'В каждые полчаса видно, сколько устройств занято.'],
    ],
    limits: 'Онлайн-заявка: до 6 часов и не раньше чем за 60 дней.',
  },
  kiosk: {
    title: 'Киоск на каждом PC, где всё решают часы',
    body: 'Клиент для Windows занимает весь экран, пока игрок не войдёт, а затем показывает его время и библиотеку игр. Когда время заканчивается, сеанс завершается сам.',
    alt: 'Экран киоска с оставшимся временем и библиотекой игр',
    points: ['Полноэкранная блокировка на Windows 10 и 11', 'Запуск игр через Steam, EXE или ссылку', 'Маленький таймер поверх окон во время игры', 'Игры закрываются при завершении сеанса'],
  },
  features: {
    title: 'Что в расписании',
    items: [
      ['Баланс времени клиентов', 'Пополняйте, списывайте или задавайте часы с полной историей.'],
      ['Живой зал', 'Занятые, свободные, выключенные PC и низкий баланс на одном экране.'],
      ['Удалённое управление', 'Завершайте сеанс или выключайте PC из админ-панели.'],
      ['Календарь броней', 'Бронь перетаскиванием, групповые брони на PC и консоли.'],
      ['Каталог игр', 'Вы решаете, что видно на киоске и как запускается каждая игра.'],
      ['Отчёты', 'Сеансы, использование, пополнения и списания по дням, клиентам и PC, экспорт в CSV.'],
      ['Профиль клиента', 'Игрок может посмотреть баланс и историю в браузере.'],
      ['Языки для персонала', 'Админ-панель и киоск работают на грузинском, английском и русском.'],
    ],
  },
  gallery: {
    title: 'Настоящий продукт',
    shots: [
      { file: 'room.webp', caption: 'Живой зал', alt: 'Панель с десятью карточками PC: игроки, игры и оставшееся время' },
      { file: 'calendar.webp', caption: 'Календарь броней', alt: 'Календарь на день с бронями на десяти PC и двух консолях' },
      { file: 'reports.webp', caption: 'Отчёты', alt: 'Отчёт с сеансами, использованием и пополнениями по дням' },
      { file: 'users.webp', caption: 'Клиенты', alt: 'Список клиентов с балансами' },
      { file: 'games.webp', caption: 'Каталог игр', alt: 'Каталог игр с параметрами запуска' },
    ],
  },
  faq: {
    title: 'Вопросы',
    items: [
      ['Нужен ли игроку аккаунт для брони?', 'Нет. Достаточно имени и телефона. Клуб перезвонит для подтверждения.'],
      ['Можно ли забронировать одно время дважды?', 'Нет. Сервер проверяет каждую заявку, и даже неподтверждённая заявка уже занимает места.'],
      ['Какими устройствами он управляет?', 'На PC работает киоск для Windows с живым учётом времени. Консоли есть в календаре броней.'],
      ['На каких компьютерах работает киоск?', 'Windows 10 и Windows 11, 64-бит.'],
      ['На каких языках работает программа?', 'Админ-панель и киоск на грузинском, английском и русском. Этот сайт также доступен на турецком и немецком.'],
      ['Сколько это стоит?', 'Цена зависит от вашего клуба. Позвоните или напишите, и мы всё расскажем.'],
    ],
  },
  contact: {
    title: 'Есть клуб? Давайте поговорим.',
    body: 'Расскажите, сколько у вас мест. Мы покажем систему и ответим на вопросы.',
    call: 'Позвонить',
    email: 'Написать',
  },
  footer: { demo: 'На экранах и в видео вымышленные демо-данные.', rights: 'Все права защищены.' },
  consent: { body: 'Можно использовать cookie Google Analytics, чтобы понимать, как используется сайт?', accept: 'Разрешить', decline: 'Отказаться' },
  videoFallback: 'Ваш браузер не может воспроизвести это видео.',
};

const tr: Content = {
  metaTitle: 'Game Room Manage: online rezervasyonlu internet kafe yazılımı',
  metaDescription:
    'Oyun salonu ve internet kafe yönetim yazılımı: PC süresi, kiosk, raporlar ve bilgisayar ile konsollar için online rezervasyon. Çalışırken görün, yerinizi ayırtın.',
  nav: { book: 'Rezervasyon', floor: 'Salon', booking: 'Rezervasyonlar', features: 'Özellikler', contact: 'İletişim', signIn: 'Giriş', language: 'Dil' },
  hero: {
    title: 'Her istasyon, tam zamanında.',
    body: 'Game Room Manage, oyun salonunuzun PC sürelerini, kiosklarını ve rezervasyonlarını tek ekrandan yönetir. Bu pano canlı: bir istasyon ayırtın, talep doğrudan salonun takvimine düşsün.',
    owner: 'Salonunuz mu var? Bize ulaşın',
  },
  board: {
    title: 'İstasyon ayırt',
    day: 'Gün',
    today: 'Bugün',
    from: 'Başlangıç',
    length: 'Süre',
    hoursShort: 'sa',
    stations: 'İstasyon seçin',
    free: 'Boş',
    taken: 'Dolu',
    until: '{time} kadar',
    selected: 'Seçildi',
    loading: 'Pano kontrol ediliyor…',
    loadFailed: 'Pano yüklenemedi.',
    retry: 'Tekrar dene',
    name: 'Adınız',
    phone: 'Telefon',
    submit: 'Rezervasyon iste',
    sending: 'Gönderiliyor…',
    privacy: 'Adınızı ve telefonunuzu yalnızca bu rezervasyonu onaylamak için kullanırız.',
    pickStation: 'En az bir boş istasyon seçin.',
    needName: 'Adınızı girin.',
    needPhone: 'Geçerli bir telefon numarası girin.',
    doneTitle: 'Talebiniz alındı',
    doneBody: '{stations}, {time}. Salon bu saati sizin için tutuyor ve onay için sizi arayacak.',
    another: 'Yeni rezervasyon',
    errConflict: 'Bu saat az önce alındı. Pano güncellendi, başka bir saat seçin.',
    errPast: 'Bu saat geçti. Daha geç bir saat seçin.',
    errTooMany: 'Zaten onaylanmamış birkaç talep var. Lütfen bizi arayın.',
    errRate: 'Çok fazla deneme yapıldı. Bir dakika bekleyip tekrar deneyin.',
    errGeneric: 'Talep gönderilemedi. Tekrar deneyin veya bizi arayın.',
    closed: 'Bu günde boş saat kalmadı. Başka bir gün seçin.',
  },
  floor: {
    title: 'Masadan kalkmadan tüm salonu görün',
    body: 'Her PC kimin oynadığını, neyi başlattığını ve ne kadar süresi kaldığını gösterir. Oturumu aynı karttan başlatın, duraklatın veya bitirin.',
    videoLabel: 'Video: salon ekranında müşteri oturumunu başlatma ve duraklatma',
    points: ['Süreyi saniyesine kadar sunucu hesaplar', 'Duraklatılan oturumda saat durur ve PC kilitlenir', 'Müşterinin süresi bitmeden uyarı gelir'],
  },
  booking: {
    title: 'Kendiliğinden gelen rezervasyonlar',
    body: 'Oyuncular uygulama veya hesap olmadan bu sayfadan rezervasyon yapar. Personel tüm talepleri, bütün PC ve konsolların yer aldığı 14:00–02:00 günlük takvimde görür.',
    videoLabel: 'Video: online talebi onaylama ve takvime rezervasyon ekleme',
    steps: [
      ['Oyuncu saati seçer', 'Gün, başlangıç, süre ve bir veya daha fazla boş istasyon.'],
      ['Saat tutulur', 'Talep bu istasyonları ayırır, böylece çifte rezervasyon olmaz.'],
      ['Personel onaylar', 'Takvimde kehribar renginde görünür. Oyuncuyu arayın, onaylayın veya reddedin.'],
      ['Gün net kalır', 'Her yarım saatte kaç cihazın dolu olduğu tam olarak görünür.'],
    ],
    limits: 'Online talepler en fazla 6 saatlik olabilir ve en çok 60 gün önceden yapılabilir.',
  },
  kiosk: {
    title: 'Her PC’de kiosk, kontrol saatte',
    body: 'Windows istemcisi müşteri giriş yapana kadar tüm ekranı kaplar, ardından süresini ve oyun kütüphanesini gösterir. Süre bitince oturum kendiliğinden sona erer.',
    alt: 'Kalan süreyi ve oyun kütüphanesini gösteren kiosk ekranı',
    points: ['Windows 10 ve 11 için tam ekran kilit', 'Steam, EXE veya bağlantıyla oyun başlatma', 'Oyun sırasında her zaman üstte küçük sayaç', 'Oturum bitince oyunlar kapanır'],
  },
  features: {
    title: 'Tarifede neler var',
    items: [
      ['Müşteri süre bakiyesi', 'Saat ekleyin, düşün veya ayarlayın; her müşteri için tam geçmiş.'],
      ['Canlı salon', 'Dolu, boş, kapalı ve bakiyesi azalan PC’ler tek ekranda.'],
      ['Uzaktan kontrol', 'Yönetim panelinden oturumu bitirin veya PC’yi kapatın.'],
      ['Rezervasyon takvimi', 'Sürükleyerek rezervasyon, PC ve konsollarda grup rezervasyonu.'],
      ['Oyun kataloğu', 'Kioskta neyin görüneceğine ve her oyunun nasıl başlayacağına siz karar verin.'],
      ['Raporlar', 'Güne, müşteriye ve PC’ye göre oturum, kullanım, yükleme ve düşümler; CSV dışa aktarma.'],
      ['Müşteri profili', 'Oyuncular bakiyesini ve geçmişini web’den görebilir.'],
      ['Personel dilleri', 'Yönetim paneli ve kiosk Gürcüce, İngilizce ve Rusça çalışır.'],
    ],
  },
  gallery: {
    title: 'Gerçek ürün',
    shots: [
      { file: 'room.webp', caption: 'Canlı salon', alt: 'Oyuncuları, oyunları ve kalan süreyi gösteren on PC kartlı panel' },
      { file: 'calendar.webp', caption: 'Rezervasyon takvimi', alt: 'On PC ve iki konsoldaki rezervasyonları gösteren günlük takvim' },
      { file: 'reports.webp', caption: 'Raporlar', alt: 'Güne göre oturum, kullanım ve yüklemeleri gösteren rapor' },
      { file: 'users.webp', caption: 'Müşteriler', alt: 'Bakiyeleriyle müşteri listesi' },
      { file: 'games.webp', caption: 'Oyun kataloğu', alt: 'Başlatma ayarlarıyla oyun kataloğu' },
    ],
  },
  faq: {
    title: 'Sorular',
    items: [
      ['Oyuncunun rezervasyon için hesabı olmalı mı?', 'Hayır. Ad ve telefon yeterli. Salon onay için arar.'],
      ['Aynı saat iki kez ayırtılabilir mi?', 'Hayır. Sunucu her talebi kontrol eder; onaylanmamış talep bile istasyonları tutar.'],
      ['Hangi cihazları yönetiyor?', 'PC’lerde canlı süre takipli Windows kiosku çalışır. Konsollar rezervasyon takviminde yer alır.'],
      ['Kiosk hangi bilgisayarlarda çalışır?', 'Windows 10 ve Windows 11, 64 bit.'],
      ['Yazılım hangi dillerde?', 'Yönetim paneli ve kiosk Gürcüce, İngilizce ve Rusçadır. Bu web sitesi ayrıca Türkçe ve Almanca sunulur.'],
      ['Fiyatı nedir?', 'Fiyat salonunuza göre değişir. Arayın veya e-posta gönderin, size anlatalım.'],
    ],
  },
  contact: {
    title: 'Salonunuz mu var? Konuşalım.',
    body: 'Kaç istasyonunuz olduğunu söyleyin. Sistemi gösterelim, sorularınızı yanıtlayalım.',
    call: 'Ara',
    email: 'E-posta',
  },
  footer: { demo: 'Ekranlar ve videolar kurgusal demo verileri içerir.', rights: 'Tüm hakları saklıdır.' },
  consent: { body: 'Sitenin nasıl kullanıldığını anlamak için Google Analytics çerezlerini kullanabilir miyiz?', accept: 'İzin ver', decline: 'Reddet' },
  videoFallback: 'Tarayıcınız bu videoyu oynatamıyor.',
};

const de: Content = {
  metaTitle: 'Game Room Manage: Software für Gaming-Cafés mit Online-Buchung',
  metaDescription:
    'Verwaltungssoftware für Gaming-Cafés: PC-Zeit, Kiosk, Berichte und Online-Buchung für PCs und Konsolen. Sehen Sie sie in Aktion und buchen Sie einen Platz.',
  nav: { book: 'Buchen', floor: 'Saal', booking: 'Buchungen', features: 'Funktionen', contact: 'Kontakt', signIn: 'Anmelden', language: 'Sprache' },
  hero: {
    title: 'Jeder Platz, pünktlich.',
    body: 'Game Room Manage steuert PC-Zeit, Kioske und Buchungen Ihres Gaming-Cafés auf einem Bildschirm. Diese Tafel ist live: Reservieren Sie einen Platz, und die Anfrage landet im Kalender des Clubs.',
    owner: 'Eigener Club? Sprechen Sie uns an',
  },
  board: {
    title: 'Platz buchen',
    day: 'Tag',
    today: 'Heute',
    from: 'Ab',
    length: 'Dauer',
    hoursShort: 'Std.',
    stations: 'Plätze wählen',
    free: 'Frei',
    taken: 'Belegt',
    until: 'bis {time}',
    selected: 'Gewählt',
    loading: 'Tafel wird geprüft…',
    loadFailed: 'Die Tafel konnte nicht geladen werden.',
    retry: 'Erneut versuchen',
    name: 'Ihr Name',
    phone: 'Telefon',
    submit: 'Buchung anfragen',
    sending: 'Wird gesendet…',
    privacy: 'Name und Telefonnummer nutzen wir nur, um diese Buchung zu bestätigen.',
    pickStation: 'Wählen Sie mindestens einen freien Platz.',
    needName: 'Geben Sie Ihren Namen ein.',
    needPhone: 'Geben Sie eine gültige Telefonnummer ein.',
    doneTitle: 'Anfrage erhalten',
    doneBody: '{stations}, {time}. Der Club hält diese Zeit frei und ruft Sie zur Bestätigung an.',
    another: 'Weitere Buchung',
    errConflict: 'Diese Zeit wurde gerade vergeben. Die Tafel ist aktualisiert, bitte wählen Sie eine andere.',
    errPast: 'Diese Zeit ist schon vorbei. Wählen Sie eine spätere.',
    errTooMany: 'Es gibt bereits mehrere unbestätigte Anfragen. Bitte rufen Sie uns an.',
    errRate: 'Zu viele Versuche. Warten Sie eine Minute und versuchen Sie es erneut.',
    errGeneric: 'Die Anfrage kam nicht an. Versuchen Sie es erneut oder rufen Sie uns an.',
    closed: 'An diesem Tag ist keine Zeit mehr frei. Wählen Sie einen anderen Tag.',
  },
  floor: {
    title: 'Den ganzen Raum im Blick, ohne vom Tresen aufzustehen',
    body: 'Jeder PC zeigt, wer spielt, was gestartet wurde und wie viel Zeit bleibt. Sitzungen starten, pausieren oder beenden Sie direkt auf derselben Karte.',
    videoLabel: 'Video: Kundensitzung im Live-Saal starten und pausieren',
    points: ['Der Server rechnet die Zeit sekundengenau ab', 'In der Pause steht die Uhr und der PC ist gesperrt', 'Warnungen kommen, bevor die Zeit abläuft'],
  },
  booking: {
    title: 'Buchungen, die von selbst kommen',
    body: 'Spieler reservieren direkt auf dieser Seite, ohne App und Konto. Das Team sieht jede Anfrage im Tageskalender mit allen PCs und Konsolen von 14:00 bis 02:00 Uhr.',
    videoLabel: 'Video: Online-Anfrage bestätigen und Buchung im Kalender anlegen',
    steps: [
      ['Der Spieler wählt die Zeit', 'Tag, Beginn, Dauer und einen oder mehrere freie Plätze.'],
      ['Der Termin wird gehalten', 'Die Anfrage blockiert diese Plätze, Doppelbuchungen sind ausgeschlossen.'],
      ['Das Team bestätigt', 'Sie erscheint bernsteinfarben im Kalender. Spieler anrufen, dann bestätigen oder ablehnen.'],
      ['Der Tag bleibt übersichtlich', 'Für jede halbe Stunde sehen Sie genau, wie viele Geräte belegt sind.'],
    ],
    limits: 'Online-Anfragen sind bis zu 6 Stunden lang und bis zu 60 Tage im Voraus möglich.',
  },
  kiosk: {
    title: 'Ein Kiosk auf jedem PC, die Uhr hat das Sagen',
    body: 'Der Windows-Client füllt den Bildschirm, bis sich ein Kunde anmeldet, und zeigt dann seine Zeit und die Spielebibliothek. Läuft die Zeit ab, endet die Sitzung von selbst.',
    alt: 'Kiosk-Bildschirm mit Restzeit und Spielebibliothek',
    points: ['Vollbildsperre für Windows 10 und 11', 'Spiele über Steam, EXE oder Link starten', 'Kleiner Timer immer im Vordergrund beim Spielen', 'Spiele schließen sich am Sitzungsende'],
  },
  features: {
    title: 'Was auf dem Fahrplan steht',
    items: [
      ['Zeitguthaben der Kunden', 'Stunden aufladen, abziehen oder setzen, mit vollständigem Verlauf.'],
      ['Live-Saal', 'Belegte, freie, ausgeschaltete PCs und niedriges Guthaben auf einem Bildschirm.'],
      ['Fernsteuerung', 'Sitzung beenden oder PC herunterfahren, direkt aus dem Admin-Bereich.'],
      ['Buchungskalender', 'Buchen per Ziehen, Gruppenbuchungen über PCs und Konsolen.'],
      ['Spielekatalog', 'Sie bestimmen, was am Kiosk erscheint und wie jedes Spiel startet.'],
      ['Berichte', 'Sitzungen, Nutzung, Aufladungen und Abzüge nach Tag, Kunde und PC, mit CSV-Export.'],
      ['Kundenprofil', 'Spieler sehen Guthaben und Verlauf im Web.'],
      ['Sprachen fürs Team', 'Admin-Bereich und Kiosk laufen auf Georgisch, Englisch und Russisch.'],
    ],
  },
  gallery: {
    title: 'Das echte Produkt',
    shots: [
      { file: 'room.webp', caption: 'Live-Saal', alt: 'Dashboard mit zehn PC-Karten: Spieler, Spiele und Restzeit' },
      { file: 'calendar.webp', caption: 'Buchungskalender', alt: 'Tageskalender mit Buchungen auf zehn PCs und zwei Konsolen' },
      { file: 'reports.webp', caption: 'Berichte', alt: 'Bericht mit Sitzungen, Nutzung und Aufladungen nach Tag' },
      { file: 'users.webp', caption: 'Kunden', alt: 'Kundenliste mit Guthaben' },
      { file: 'games.webp', caption: 'Spielekatalog', alt: 'Spielekatalog mit Starteinstellungen' },
    ],
  },
  faq: {
    title: 'Fragen',
    items: [
      ['Brauchen Spieler ein Konto zum Buchen?', 'Nein. Name und Telefonnummer genügen. Der Club ruft zur Bestätigung an.'],
      ['Kann eine Zeit doppelt gebucht werden?', 'Nein. Der Server prüft jede Anfrage, und schon eine unbestätigte Anfrage hält die Plätze frei.'],
      ['Welche Geräte werden verwaltet?', 'Auf PCs läuft der Windows-Kiosk mit Live-Zeiterfassung. Konsolen stehen im Buchungskalender.'],
      ['Auf welchen Computern läuft der Kiosk?', 'Windows 10 und Windows 11, 64 Bit.'],
      ['In welchen Sprachen gibt es die Software?', 'Admin-Bereich und Kiosk gibt es auf Georgisch, Englisch und Russisch. Diese Website ist zusätzlich auf Türkisch und Deutsch verfügbar.'],
      ['Was kostet es?', 'Der Preis hängt von Ihrem Club ab. Rufen Sie an oder schreiben Sie uns, wir erklären alles.'],
    ],
  },
  contact: {
    title: 'Eigener Club? Lassen Sie uns reden.',
    body: 'Sagen Sie uns, wie viele Plätze Sie haben. Wir zeigen Ihnen das System und beantworten Ihre Fragen.',
    call: 'Anrufen',
    email: 'E-Mail',
  },
  footer: { demo: 'Bildschirme und Videos zeigen erfundene Demodaten.', rights: 'Alle Rechte vorbehalten.' },
  consent: { body: 'Dürfen wir Google-Analytics-Cookies nutzen, um zu verstehen, wie diese Website verwendet wird?', accept: 'Erlauben', decline: 'Ablehnen' },
  videoFallback: 'Ihr Browser kann dieses Video nicht abspielen.',
};

export const CONTENT: Record<Locale, Content> = { en, ka, ru, tr, de };
