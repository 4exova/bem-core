# BEM Core Library

## Что это?

Базовая библиотека блоков для разработки веб-интерфейсов.
Содержит только необходимый минимум для разработки клиентского js и html-шаблонов.

## Использование

Наиболее простым способом начать проект с использованием `bem-core` является [project-stub](https://github.com/bem/project-stub).

Вы также можете добавить библиотеку к себе в проект любым известным вам способом.

## Состав

### Уровни

### Блоки

### Технологии

## История изменений

История изменений доступна на [отдельной странице](CHANGELOG.md).

## Миграция

Миграция описана на [отдельной странице](MIGRATION.md).

## Разработка

### Рабочая копия

1. Получаем исходники:
```
$ git clone git@github.com:bem/bem-core.git
$ cd bem-core
```

2. Устанавливаем зависимости:
```
$ npm install
```
Для последующего запуска локально установленных bem-tools нам потребуется `export PATH=./node\_modules/.bin:$PATH` или любой альтернативный способ.

3. С помощью bem-tools устанавливаем все зависимые библиотеки:
```
$ bem make vendor
```

4. Собираем примеры и тесты:
```
$ bem make sets
```

5. Запускаем разработческий сервер:
```
$ bem server
```

### Внесение изменений

### Модульное тестирование

Перед тем как запускать тесты, должны быть установлены npm-пакеты и загружены библиотеки:

    $ npm install
    $ ./node_modules/.bin/bem make vendor

Сборка дефолтного тестового бандла для `ecma__array`:

    $ ./node_modules/.bin/bem make common.sets/ecma__array.tests/default

После сборки тестового бандла вы увидите результаты выполнения тестов в консоли.
Их также можно посмотреть в браузере, открыв `common.sets/ecma__array.tests/default.html`.

По аналогии можно запустить тесты для других бем-сущностей, имеющих реализацию в технологии `test.js`.

Для сборки и запуска тестов используется библиотека [bem-pr](https://github.com/narqo/bem-pr).
Подробная информация про инфраструктуру тестирования bem-pr: https://github.com/narqo/bem-pr/blob/master/docs/tests.ru.md
