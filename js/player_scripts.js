var context, // web audio context
    source, // источник звука
    filterNode = null; // фильтр

// оберну в замыкание
(function (win) {
    var bufferGlobal, // глобальный буфер песни, для повторного воспроизведения (создается при загрузке песни)
        destination, // получатель звука
        sp, // визуализатор waveform
        timeFull = 0, // полное время песни в миллисекундах
        isPaused = 0, // флаг паузы
        canvas, // канвас с визуализацией
        $pausebtn, // кнопка паузы
        $resumebtn; // кнопка поспроизведения

    var startOffset = 0, // переменные для сохранения времени при нажании паузы
        startTime = 0;
})(window);

// функция обработки исходяего сигнала
function audioProcess(ape) {
    'use strict';
    var time = 0;

    // если песня воспроизводится (не пауза) меняем ползунок прогресса
    if (!window.isPaused) {
        time = (context.currentTime - window.startTime + window.startOffset) * 1000;
        $("#timer").text(toTime(time % window.timeFull) + "/" + toTime(window.timeFull));
        $("#progress").css("width", (time * 100) / (window.timeFull) + "%");
    }

    // если песня закончилась, то останавливаем источник звука и меняем кнопки
    if (time > window.timeFull) {
        source.stop();
        window.isPaused = 1;
        window.startOffset = 0;
        window.$resumebtn.css('display', 'inline-block');
        window.$pausebtn.css('display', 'none');
    }

    // переменные для анализа сигнала
    var canvasHh = Math.floor(window.canvas.offsetHeight / 2);
    var inputBuffer = ape.inputBuffer;
    var outputBuffer = ape.outputBuffer;
    var channel;
    var channelsLen = outputBuffer.numberOfChannels;
    var sample;
    var sampleLen = inputBuffer.length;

    // для визулизации создаем монобуфер
    var mono = [sampleLen];
    for (sample = 0; sample < sampleLen; sample += 1) {
        mono[sample] = 0;
    }

    var inputData = inputBuffer.getChannelData(channel);
    for (channel = 0; channel < channelsLen; channel += 1) {

        // микшируем в монобуфер все каналы
        for (sample = 0; sample < sampleLen; sample += 1) {
            mono[sample] = (mono[sample] + inputData[sample]) / 2;
        }
    }
    vizualize(mono, canvasHh);
}

// функция воспроизведения песни
// подключаются все необходимые буферыЮ фильтры, анализаторы и т.п.
function playSound() {
    'use strict';
    window.$pausebtn.show(0);
    window.$resumebtn.hide(0);
    // создание буфера и присвоение ему глабольного буфера
    source = context.createBufferSource();
    source.buffer = window.bufferGlobal;
    // создаем и подключаем контекст
    window.destination = context.destination;
    source.connect(window.destination);
    // подключаем визуализатор
    source.connect(window.sp);
    window.sp.connect(context.destination);
    // подключаем фильтр
    source.connect(filterNode);
    filterNode.connect(context.destination);
    // startTime - начальное время при воспроизведении (после паузы != 0)
    window.startTime = context.currentTime;
    // бывает, когда startOffset меньше нуля (при манипуляции с полосой прогресса), проверяем это
    if (window.startOffset < 0) {
        source.start(0, 1 % window.bufferGlobal.duration);
    } else {
        source.start(0, window.startOffset % window.bufferGlobal.duration);
    }
    // меняем флаг
    window.isPaused = 0;
}

// функция остановки пвоспроизведения
// выключает источник и отключает от него всё, меняем кнопки
function stopSound() {
    'use strict';
    window.$resumebtn.show(0);
    window.$pausebtn.hide(0);
    source.stop();
    window.isPaused = 1;
}

// визуализация открытия плеера
function playerOpening() {
    'use strict';
    setTimeout(function () {
        $("#container").animate({opacity: "0"}, 1000);
    }, 1000);
    setTimeout(function () {
        $("#container").css({height: "450px", width: "500px", margin: "-225px 0 0 -250px"});
        $("#file").css({top: "350px", left: "100px"});
    }, 2100);
    setTimeout(function () {
        $("#container").animate({opacity: "1"}, 1000);
    }, 2200);
    $("#container").draggable();
}

// инициализация канваса с визуализацией
function initCanvas() {
    'use strict';
    // переменные для работы с визуализатором
    window.canvas = document.getElementById("visualizer");

    // настраиваем поле для визуализатора
    window.canvas.ctx = window.canvas.getContext("2d");
    window.canvas.ctx.strokeStyle = "#eee";
    window.canvas.ctx.lineWidth = 2;
    window.canvas.ctx.fillStyle = "rgba(0, 0, 0, 0)";
    window.canvas.ctx.fillRect(0, 0, window.canvas.offsetWidth, window.canvas.offsetHeight);
}

// функция отрисовки линий waveform
function vizualize(sample, canvasHh) {
    'use strict';
    window.canvas.ctx.clearRect(0, 0, window.canvas.width, window.canvas.height);
    window.canvas.ctx.fillRect(0, 0, window.canvas.width, window.canvas.height);
    window.canvas.ctx.beginPath();

    window.canvas.ctx.moveTo(-1, canvasHh);
    var y, x;

    for (x = 0; x < window.canvas.width; x += 1) {
        y = canvasHh - Math.floor(sample[x] * canvasHh);
        window.canvas.ctx.lineTo(x, y);
    }

    window.canvas.ctx.stroke();
}

// преобразовываем время в нормальный вид
function toTime(ms) {
    'use strict';
    var date = new Date(null);
    date.setSeconds(ms/1000);
    return date.toISOString().substring(14, 19);
}

// обновляем метаданные
function updateMetaData(file) {
    'use strict';
    ID3.loadTags(file.name, function () {

        var artistLink = "about:blank", // ссылка на исполнителя в ya.music
            coverLink = "https://music.yandex.ru/", // ссылка на альбом в ya.music
            title = "Unknown title", // название песни
            artist = "Unknown artist"; // исполнитель

        var tags = ID3.getAllTags(file.name);
        title = tags.title || "Unknown title";

        if (tags.artist) {
            artist = tags.artist;
            artistLink = "https://music.yandex.ru/search?text=" + tags.artist;
        }

        if (tags.album) {
            coverLink = "https://music.yandex.ru/search?text=" + tags.album;
        }

        $("#title").text(title);
        $("#artist").text(artist);
        $("#artist-link").attr("href", artistLink);
        $("#cover-link").attr("href", coverLink);

        if ("picture" in tags) {
            var cover = tags.picture;
            var base64String = "";
            var i;
            for (i = 0; i < cover.data.length; i += 1) {
                base64String += String.fromCharCode(cover.data[i]);
            }
            $("#cover").hide();
            $("#cover").attr("src", "data:" + cover.format + ";base64," + window.btoa(base64String));
            $("#cover").fadeIn(1000);

        } else {
            $("#cover").hide();
            $("#cover").attr("src", "images/album.png");
            $("#cover").fadeIn(1000);
        }
    },
    {
        tags: ["artist", "title", "picture", "album"], dataReader: FileAPIReader(file)
    });
}

// создаем context и фильтр
$(document).ready(function () {
    'use strict';

    try {
        context = new window.AudioContext() || window.webkitAudioContext();
    } catch (e) {
        alert("Web Audio API is not supported in this browser");
    }

    filterNode = context.createBiquadFilter();

    // тут же инициализируем кнопки
    window.$pausebtn = $("#pause-button");
    window.$resumebtn = $("#resume-button");
});

// события в плеере
$(function () {
    'use strict';

    // кнопка about
    $("#about").click(function () {
        var box = $("#about-box");
        box.toggle(300);
        setTimeout(function () {
            box.css({top: "150px", left: "125px"});
        }, 300);
        box.draggable();
    });

    // кнопка pause
    window.$pausebtn.click(function () {
        stopSound();
        window.startOffset += context.currentTime - window.startTime;
    });

    // кнопка resume
    window.$resumebtn.click(function () {
        playSound();
    });

    // события на области загрузки
    $("#file").on("dragenter", function () {
        $("#move-here").animate({'background-color': '#333'}, 300);
    });
    $("#file").on("dragleave", function () {
        $("#move-here").animate({'background-color': '#ddd'}, 300);
    });
    $("#file").hover(function () {
        $("#move-here").animate({"background-color": "#333"}, 300);
        $("#move-here span").animate({color: "#eee"}, 300);
    }, function () {
        $("#move-here").animate({"background-color": "#ddd"}, 300);
        $("#move-here span").animate({color: "#333"}, 300);
    });

    // события на полосе прогресса
    $("#songJump").click(function (e) {

        stopSound();

        var posPescents = (e.pageX - $(this).offset().left) / $(this).width();

        if (posPescents >= 1) {
            posPescents = 0;
        }

        window.startOffset = (window.timeFull / 1000) * posPescents;

        playSound();
    });

    // события на кнопках эквалайзера
    $("#equalizer-btns #Pop").click(function () {
        $("#equalizer-btns button").css('background-color', 'rgba(229, 229, 229, .7)');
        $(this).css('background-color', '#aaa');
        // отключаем фильтр, который подключен сейчас, создаем новый
        filterNode.disconnect(window.destination);
        filterNode = null;
        filterNode = context.createBiquadFilter();
        // указываем параметр, к которому применяется фильтр
        filterNode.type = 4;
        // частотф
        filterNode.frequency.value = 320;
        // величина усиления
        filterNode.gain.value = 10;

        filterNode.type = 5;
        filterNode.frequency.value = 1700;
        filterNode.gain.value = -10;
        // заново подключаем
        source.connect(filterNode);
        filterNode.connect(window.destination);
    });
    $("#equalizer-btns #Rock").click(function () {
        $("#equalizer-btns button").css('background-color', 'rgba(229, 229, 229, .7)');
        $(this).css('background-color', '#aaa');
        filterNode.disconnect(window.destination);
        filterNode = null;
        filterNode = context.createBiquadFilter();
        filterNode.type = 4;
        filterNode.frequency.value = 1500;
        filterNode.gain.value = -10;
        source.connect(filterNode);
        filterNode.connect(window.destination);
    });
    $("#equalizer-btns #Jazz").click(function () {
        $("#equalizer-btns button").css('background-color', 'rgba(229, 229, 229, .7)');
        $(this).css('background-color', '#aaa');
        filterNode.disconnect(window.destination);
        filterNode = null;
        filterNode = context.createBiquadFilter();
        filterNode.type = 4;
        filterNode.frequency.value = 250;
        filterNode.Q.value = 5;
        filterNode.type = 5;
        filterNode.frequency.value = 2000;
        filterNode.Q.value = 3;
        source.connect(filterNode);
        filterNode.connect(window.destination);
    });
    $("#equalizer-btns #Classic").click(function () {
        $("#equalizer-btns button").css('background-color', 'rgba(229, 229, 229, .7)');
        $(this).css('background-color', '#aaa');
        filterNode.disconnect(window.destination);
        filterNode = null;
        filterNode = context.createBiquadFilter();
        filterNode.type = "lowpass";
        filterNode.frequency.value = 0;
        filterNode.Q.value = 0;
        filterNode.gain.value = -1;
        source.connect(filterNode);
        filterNode.connect(window.destination);
    });
    $("#equalizer-btns #Normal").click(function () {
        $("#equalizer-btns button").css('background-color', 'rgba(229, 229, 229, .7)');
        $(this).css('background-color', '#aaa');
        filterNode.disconnect(window.destination);
        filterNode = null;
        filterNode = context.createBiquadFilter();
        filterNode.type = 1;
        filterNode.frequency.value = 0;
        filterNode.Q.value = 0;
        source.connect(filterNode);
        filterNode.connect(window.destination);
    });
});

$(window).load(function () {
    'use strict';

    playerOpening();
    initCanvas();

    // функция вызывается при начале воспроизведения
    function playsound(raw) {
        context.decodeAudioData(raw, function (buffer) {
            // если получили пустой буфер, значит файл не прочитался - завершаем работу
            if (!buffer) {
                $("#name").text("Невозможно прочитать файл");
                return;
            }
            // останавливаем предыдущую песню, если запущена
            if (source) {
                source.stop(0);
            }
            // сбрасываем предыдущий визуализатор, если уже был создан
            if (window.sp) {
                window.sp.disconnect(window.destination);
                window.sp = null;
            }

            // сохраняем буфер в глобальный буфер
            window.bufferGlobal = buffer;
            // сохраняем полною продолжительность песни
            window.timeFull = window.bufferGlobal.duration * 1000;
            // т.к. проигрывается с самого начала:
            window.startOffset = 0;
            // открываем панель управления, скрываем анимацию загрузки и кнопку ожидания
            $("#manualing").fadeIn(800);
            $("#loading").animate({opacity: '0'}, 500);
            $("#wait-button").css('display', 'none');

            /*
            * создание объекта ScriptProcessor
            * аргументы: длина буфера, количество входящих каналов, количество исходящих каналов
            * чем больше буфер - тем меньшее число раз будет вызыван код обработки,
            * должен быть кратен степени двойки
            */
            window.sp = context.createScriptProcessor ? context.createScriptProcessor(512, 2, 2) : context.createJavaScriptNode(512, 2, 2);
            window.sp.onaudioprocess = audioProcess;
            // начинаем воспроизведение
            playSound();

        }, function (error) {
            console.error("failed to decode:", error);
        });
    }

    // функция обработки события изменения файла в input`е
    function onfilechange(then, evt) {

        var files = evt.target.files;

        if (files[0]) {
            // показываем анимацию загрузки
            $("#loading").animate({opacity: '1'}, 500);
            var selFile = files[0];
            var reader = new FileReader();
            // выводим имя файла в текстовое поле
            $("#name").text(selFile.name);

            // функция обработки события загрузки файла
            reader.onload = function (e) {
                updateMetaData(selFile);
                then(e.target.result);
            };

            reader.onerror = function (e) {
                console.error(e);
            };

            reader.readAsArrayBuffer(selFile);
        }
    }
    document.getElementById('file').addEventListener('change', onfilechange.bind(null, playsound), false);
});