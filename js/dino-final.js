(function(){
  'use strict';
  var app=document.getElementById('dino-app');
  var progress=document.getElementById('dino-progress');
  var toast=document.getElementById('dino-toast');
  var reset=document.getElementById('dino-reset');
  var state={screen:'intro',learn:0,learnSeen:{},activeFeature:null,skeleton:0,cat:0,birds:[0,1,2],finalOrder:[0,1,2],identifyDone:false,puzzlePlaced:[],puzzleSelected:null,birdLearn:false,birdPhase:'look'};
  var slideHistory=[],slidePos=-1,restoringSlide=false;
  function stateSnapshot(){return JSON.parse(JSON.stringify(state))}
  function stateSignature(x){return JSON.stringify(x)}
  function updateSlideNav(){var prev=document.getElementById('slide-prev'),next=document.getElementById('slide-next');if(prev)prev.disabled=slidePos<=0;if(next)next.disabled=slidePos>=slideHistory.length-1}
  function rememberSlide(){if(restoringSlide){restoringSlide=false;updateSlideNav();return}var snap=stateSnapshot();if(slidePos>=0&&stateSignature(slideHistory[slidePos])===stateSignature(snap)){updateSlideNav();return}slideHistory=slideHistory.slice(0,slidePos+1);slideHistory.push(snap);slidePos=slideHistory.length-1;updateSlideNav()}
  function goSlide(delta){var target=slidePos+delta;if(target<0||target>=slideHistory.length)return;slidePos=target;state=JSON.parse(JSON.stringify(slideHistory[slidePos]));restoringSlide=true;render()}
  if(window.DINO_START==='birds-game'){
    state.screen='birds';
    state.birdLearn=true;
    state.birdPhase='game';
  }
  var dinos=[
    {id:'triceratops',name:'Трицератопс',img:'assets/dino/triceratops-panorama-final.png',period:'≈ 68–66 млн лет назад',place:'Северная Америка',hotspots:[[24,20],[48,20],[22,69]],labels:[[14,36],[59,14],[12,75]],facts:[['Три рога','Два длинных рога над глазами и один короткий на носу.'],['Костяной воротник','Большой костяной воротник защищал шею и голову.'],['Крепкий клюв','Крепким клювом трицератопс срывал листья и другие растения.']],options:['Тираннозавр','Трицератопс','Брахиозавр'],answer:'Трицератопс',extra:'примерно 68–66 млн лет назад.',interesting:'Трицератопс мог вырастать примерно до 9 метров в длину.'},
    {id:'stegosaurus',name:'Стегозавр',img:'assets/dino/stegosaurus-panorama-final.png',period:'≈ 155–150 млн лет назад',place:'Северная Америка и Европа',hotspots:[[50,24],[77,66],[31,72]],labels:[[65,18],[73,39],[12,68]],facts:[['Пластины на спине','Большие пластины шли вдоль всей спины.'],['Шипы на хвосте','Острые шипы на хвосте помогали защищаться.'],['Растительноядный','Стегозавр ел листья и низкие растения.']],options:['Брахиозавр','Стегозавр','Тираннозавр'],answer:'Стегозавр',extra:'примерно 155–150 млн лет назад.',interesting:'Пластины стегозавра могли помогать регулировать температуру тела.'},
    {id:'brachiosaurus',name:'Брахиозавр',img:'assets/dino/brachiosaurus-panorama-final.png',period:'≈ 154–150 млн лет назад',place:'Северная Америка',hotspots:[[27,38],[36,82],[41,20]],labels:[[16,31],[16,70],[52,12]],facts:[['Шея доставала до верхушек','Брахиозавр мог доставать листья высоко на деревьях.'],['Передние ноги длиннее','Передние ноги были длиннее задних, поэтому плечи находились выше.'],['Небольшая голова','Голова брахиозавра была небольшой по сравнению с огромным телом.']],options:['Стегозавр','Брахиозавр','Тираннозавр'],answer:'Брахиозавр',extra:'примерно 154–150 млн лет назад.',interesting:'Благодаря длинной шее он мог доставать листья на высоте около 12–15 метров.'},
    {id:'tyrannosaurus',name:'Тираннозавр',img:'assets/dino/tyrannosaurus-panorama-final.png',period:'≈ 68–66 млн лет назад',place:'Северная Америка',hotspots:[[24,40],[39,63],[68,76]],labels:[[14,20],[27,67],[79,75]],facts:[['Крупные острые зубы','Обрати внимание на зубы: у тираннозавра они были очень крупными и острыми. По таким зубам палеонтологи узнают хищника.'],['Короткие передние лапы','Передние лапы были короткими и имели по два пальца.'],['Мощные задние ноги','На мощных задних ногах тираннозавр ходил и бегал.']],options:['Брахиозавр','Тираннозавр','Стегозавр'],answer:'Тираннозавр',extra:'примерно 68–66 млн лет назад.',interesting:'У тираннозавра было около 60 крупных зубов, некоторые — длиной с банан.'}
  ];
  function say(msg){if(toast){toast.textContent='';toast.classList.remove('show')}}
  function celebrateStars(target){var host=target||(document.querySelector('.success-stars')||document.querySelector('.reward-dino'));if(!host)return;host.classList.add('star-host');var layer=document.createElement('div');layer.className='star-burst';for(var i=0;i<18;i++){var st=document.createElement('i');st.textContent=i%4===0?'★':'✦';st.style.left=(5+Math.random()*90)+'%';st.style.top=(18+Math.random()*64)+'%';st.style.setProperty('--dx',((Math.random()-.5)*90)+'px');st.style.setProperty('--dy',((-20-Math.random()*70))+'px');st.style.animationDelay=(Math.random()*.18)+'s';layer.appendChild(st)}host.appendChild(layer);setTimeout(function(){layer.remove()},1800)}
  function setProgress(step){progress.innerHTML=[1,2,3,4,5,6].map(function(n){return '<i class="'+(n<=step?'on':'')+'"></i>'}).join('')}
  function wrapImg(src,alt){return '<span class="image-wrap"><img src="'+src+'" alt="'+(alt||'')+'" draggable="false"></span>'}
  function ruText(text){return String(text).replace(/(^|\s)(и|а|но|в|во|на|до|от|с|со|к|ко|у|о|об|по|за|из|для|при|над|под)\s+/gi,function(_,lead,w){return lead+w+' '})}
  function shuffledIndices(){
    var a=[0,1,2];
    for(var i=a.length-1;i>0;i--){
      var j=Math.floor(Math.random()*(i+1));
      var t=a[i];a[i]=a[j];a[j]=t;
    }
    return a;
  }

  function bindOrder(selector,arr){
    var host=document.querySelector(selector);if(!host)return;
    var selected=null;
    host.querySelectorAll('[data-order-index]').forEach(function(card){
      card.style.cursor='pointer';
      card.addEventListener('click',function(){
        var i=Number(card.dataset.orderIndex);
        if(selected===null){selected=i;card.classList.add('selected');return}
        if(selected===i){card.classList.remove('selected');selected=null;return}
        var t=arr[selected];arr[selected]=arr[i];arr[i]=t;render();
      });
    });
  }
  function bindDrag(itemSelector,dropSelector,onDrop){
    var drop=document.querySelector(dropSelector);if(!drop)return;
    document.querySelectorAll(itemSelector).forEach(function(item){
      item.setAttribute('draggable','true');
      function complete(){if(item.classList.contains('done'))return;item.classList.add('done');item.setAttribute('draggable','false');onDrop(item)}
      item.addEventListener('dragstart',function(e){e.dataTransfer.setData('text/plain',item.dataset.drag||'finding');e.dataTransfer.effectAllowed='move';item.classList.add('dragging')});
      item.addEventListener('dragend',function(){item.classList.remove('dragging')});
      item.addEventListener('click',function(){document.querySelectorAll(itemSelector).forEach(function(x){x.classList.remove('selected')});item.classList.add('selected');say('Теперь нажми на контейнер')});
      drop.addEventListener('dragover',function(e){e.preventDefault();e.dataTransfer.dropEffect='move'});
      drop.addEventListener('drop',function(e){e.preventDefault();var active=document.querySelector(itemSelector+'.dragging');if(active===item)complete()});
    });
    drop.addEventListener('click',function(){var chosen=document.querySelector(itemSelector+'.selected');if(chosen&&!chosen.classList.contains('done')){chosen.classList.remove('selected');chosen.classList.add('done');chosen.setAttribute('draggable','false');onDrop(chosen)}});
  }

  function render(){
    document.body.classList.remove('reward-screen');
    if(state.screen==='intro') renderIntro();
    if(state.screen==='learn') renderLearn();
    if(state.screen==='identify') renderIdentify();
    if(state.screen==='skeleton') renderSkeleton();
    if(state.screen==='catastrophe') renderCatastrophe();
    if(state.screen==='birds') renderBirds();
    if(state.screen==='final-identify') renderFinalIdentify();
    if(state.screen==='final-order') renderFinalOrder();
    if(state.screen==='reward') renderReward();
    injectSlideNav();
    rememberSlide();
    app.focus({preventScroll:true});window.scrollTo({top:0});
  }

  function injectSlideNav(){
    if(state.screen==='intro'||state.screen==='reward')return;
    var panel=app.querySelector('.panel');
    if(!panel)return;
    var oldNav=panel.querySelector('.slide-nav--card');
    if(oldNav)oldNav.remove();
    var nav=document.createElement('div');
    nav.className='slide-nav slide-nav--card';
    nav.innerHTML='<button id="slide-prev" type="button" aria-label="Предыдущий экран" title="Предыдущий экран">←</button><button id="slide-next" type="button" aria-label="Следующий просмотренный экран" title="Следующий просмотренный экран">→</button>';
    panel.appendChild(nav);
    nav.querySelector('#slide-prev').addEventListener('click',function(){goSlide(-1)});
    nav.querySelector('#slide-next').addEventListener('click',function(){goSlide(1)});
  }
  new MutationObserver(function(){
    var panel=app.querySelector('.panel');
    if(panel&&!panel.querySelector('.slide-nav--card'))injectSlideNav();
  }).observe(app,{childList:true,subtree:true});
  function renderIntro(){setProgress(0);app.innerHTML='<section class="panel hero"><div class="hero-badges"><span class="hero-badge">ЭКСПЕДИЦИЯ №1</span><span class="hero-badge">≈230 млн → 66 млн лет назад</span></div><h1>Мир динозавров</h1><h2>Узнай динозавров, распознай находки и переживи катастрофу.</h2><p>Здесь всё нужно делать самому: рассматривать, выбирать, исследовать и восстанавливать историю.</p><button class="primary" data-act="start">Начать экспедицию →</button></section>'}
  function featureZoom(){return '';}

  function featurePointer(d,idx){
    var hints={
      triceratops:['Вот три рога','Вот костяной воротник','Вот крепкий клюв'],
      stegosaurus:['Вот пластины на спине','Вот шипы на хвосте','Растительноядный динозавр'],
      brachiosaurus:['Вот длинная шея','Вот передние ноги','Вот небольшая голова'],
      tyrannosaurus:['Вот крупный острый зуб','Вот короткие передние лапы','Вот мощные задние ноги']
    };
    return '<div class="feature-pointer-guide feature-pointer-guide--'+d.id+'-'+idx+'" aria-hidden="true"><span class="feature-pointer-guide__cursor">➤</span><span class="feature-pointer-guide__hint">'+hints[d.id][idx]+'</span></div>';
  }

  function initFeatureMagnifier(){}

  function renderLearn(){
    setProgress(1);
    var d=dinos[state.learn],seen=state.learnSeen[d.id]||[],current=seen.length,all=current>=3;
    var active=state.activeFeature!==null && state.activeFeature!==undefined;
    var marker='';
    d.hotspots.forEach(function(h,i){
      if(i<current){
        var side=(d.labelSides&&d.labelSides[i])||(h[0]>60?'left':'right');
        var lp=d.labels&&d.labels[i];
        var labelClass=lp?'guided-dot-label guided-dot-label--free':'guided-dot-label guided-dot-label--'+side;
        var labelStyle=lp?'--label-left:'+lp[0]+'%;--label-top:'+lp[1]+'%':'left:'+h[0]+'%;top:'+h[1]+'%';
        marker += '<span class="guided-dot guided-dot--seen" style="left:'+h[0]+'%;top:'+h[1]+'%" aria-hidden="true">✓</span>'+
          '<span class="'+labelClass+'" style="'+labelStyle+'"><b>'+ruText(d.facts[i][0])+'</b><small>'+ruText(d.facts[i][1])+'</small></span>';
      } else if(i===current && !all){
        marker += '<button class="guided-dot" style="left:'+h[0]+'%;top:'+h[1]+'%" data-act="feature" data-feature="'+current+'" aria-label="Открыть признак '+(current+1)+'">'+(current+1)+'</button>';
      }
    });
    if(active && !all){ marker += featurePointer(d,Number(state.activeFeature)); }
    var explanation='';
    if(all){
      explanation='<div class="guided-dino-meta"><div class="guided-meta-item"><b>Когда жил:</b><span>'+d.extra+'</span></div><div class="guided-meta-item"><b>Интересный факт:</b><span>'+d.interesting+'</span></div></div>';
    }else if(active){
      var af=Number(state.activeFeature), f=d.facts[af];
      var inlineZoom=featureZoom(d,af);
      explanation='<div class="guided-explanation '+(inlineZoom?'guided-explanation--with-closeup':'')+'"><div class="guided-explanation__text">'+ruText(f[1])+'</div>'+inlineZoom+'</div>';
    }
    var zoom='';
    app.innerHTML='<section class="panel guided-learn">'+
      '<div class="stage-head"><strong>МИССИЯ 1 · ЗНАКОМСТВО С ДИНОЗАВРАМИ</strong><a class="stage-home" href="index.html">← Карта времени</a><span class="stage-count">'+(state.learn+1)+' из 4</span></div>'+
      '<div class="stage-body">'+
        '<div class="guided-heading"><small>ИЗУЧИ 3 ГЛАВНЫХ ПРИЗНАКА</small><h1>'+d.name+'</h1><span>'+(all?'Все признаки изучены':'Сейчас изучаем признак '+(current+1)+' из 3')+'</span></div>'+
        '<div class="guided-workspace guided-workspace--stack"><div class="guided-photo dino-photo--'+d.id+'"><div class="guided-image-layer"><img class="guided-scene" src="'+d.img+'" alt="'+d.name+'" draggable="false">'+marker+zoom+'</div></div>'+explanation+'</div>'+
        '<div class="guided-footer"><div class="guided-progress"><span>Изучено: <b>'+seen.length+' из 3</b></span>'+[0,1,2].map(function(i){return '<i class="'+(i<seen.length?'on':'')+'"></i>'}).join('')+'</div>'+
        (all?'<button class="primary" data-act="learn-next">'+(state.learn<3?'Следующий динозавр →':'Проверить себя →')+'</button>':'<span class="guided-hint">Один признак за раз.</span>')+'</div>'+
      '</div></section>';
    initFeatureMagnifier();
  }

  function renderIdentify(){
    setProgress(1);
    toast.classList.remove('show');
    toast.textContent='';
    if(!Array.isArray(state.puzzlePlaced))state.puzzlePlaced=[];
    var placed=state.puzzlePlaced;
    var order=[2,0,3,1];
    function piece(i,extra){return '<button type="button" class="puzzle-piece puzzle-piece--large '+(extra||'')+'" data-act="puzzle-piece" data-piece="'+i+'" style="--px:'+(i%2)+';--py:'+Math.floor(i/2)+'" aria-label="Крупная деталь '+(i+1)+'"></button>'}
    var board=[0,1,2,3].map(function(i){return '<button type="button" class="puzzle-slot '+(placed.indexOf(i)>=0?'filled':'')+'" data-act="puzzle-slot" data-slot="'+i+'" style="--px:'+(i%2)+';--py:'+Math.floor(i/2)+'">'+(placed.indexOf(i)>=0?'<span class="puzzle-fixed"></span>':'<span>'+(i+1)+'</span>')+'</button>'}).join('');
    var tray=order.filter(function(i){return placed.indexOf(i)<0}).map(function(i){return piece(i,state.puzzleSelected===i?'selected':'')}).join('');
    var done=placed.length===4;
    app.innerHTML='<section class="panel compact-panel puzzle-panel"><div class="stage-head"><strong>ИГРА · СОБЕРИ ДИНОЗАВРА</strong><a class="stage-home" href="index.html">← Карта</a></div><div class="stage-body"><div class="puzzle-title"><h1>'+(done?'Стегозавр собран!':'Собери Стегозавра')+'</h1></div><div class="puzzle-layout"><div class="puzzle-board">'+board+'</div><div class="puzzle-tray '+(done?'puzzle-tray--done':'')+'"><strong>'+(done?'Готово!':'Крупные части')+'</strong><div class="puzzle-pieces">'+(done?'<div class="puzzle-done">✓<span>Все 4 части на месте</span></div>':tray)+'</div>'+(done?'<p class="puzzle-done-note"><b>Пластины на спине и шипы на хвосте помогают сразу узнать Стегозавра.</b></p>':'<p class="puzzle-instruction"><b>Всего 4 крупные части.</b> Выбери часть справа и нажми на такое же место.</p>')+'</div></div>'+(done?'<div class="success puzzle-success"><button class="primary" data-act="to-skeleton">К следующей миссии →</button></div>':'')+'</div></section>'
  }
  var fossilRevealMeta=[
    {answer:'Тираннозавр',img:'assets/dino/tyrannosaurus-new.jpg',fact:'Крупные острые зубы сразу выдают хищника.'},
    {answer:'Трицератопс',img:'assets/dino/triceratops-new.jpg',fact:'Костяной воротник находился за рогами и был частью черепа.'},
    {answer:'Стегозавр',img:'assets/dino/stegosaurus-new.jpg',fact:'Большие пластины шли вдоль спины и помогают легко узнать стегозавра.'}
  ];
  function fossilRevealMarkup(meta,nextLabel){
    return '<div class="fossil-success fossil-success--reveal"><img src="'+meta.img+'" alt="'+meta.answer+'"><div class="fossil-reveal-copy"><div class="fossil-reveal-text"><b>Верно! '+meta.answer+'.</b><span>'+meta.fact+'</span></div><button class="primary fossil-reveal-next" data-act="fossil-next">'+nextLabel+'</button></div></div>';
  }

  function renderFossilComplete(){
    var afterChest=state.cat>=3;
    app.innerHTML=`
      <section class="panel fossil-mission-panel fossil-summary-panel">
        <div class="stage-head">
          <strong>МИССИЯ 2 · ПАЛЕОНТОЛОГИЧЕСКОЕ РАССЛЕДОВАНИЕ</strong>
          <a class="stage-home" href="index.html">← Карта времени</a>
          <span class="stage-count">3 из 3</span>
        </div>
        <div class="stage-body fossil-summary-stage">
          <img class="fossil-summary-bg" src="assets/dino/mission2-complete-scene-v153.png" alt="Мальчик и три находки динозавров">
          <div class="fossil-summary-card" role="region" aria-label="Итоги находок">
            <div class="fossil-summary-mark">✓</div>
            <h1>Все находки определены!</h1>
            <p class="fossil-summary-lead">Ты узнал динозавров по настоящим признакам.</p>
            <div class="fossil-summary-list">
              <div><b>🦷 Зуб → Тираннозавр</b><span>По форме зубов учёные узнают, чем питался динозавр.</span></div>
              <div><b>▲ Пластина → Стегозавр</b><span>Костяные пластины на спине — главный признак стегозавра.</span></div>
              <div><b>🐾 Окаменевший след → Динозавр</b><span>Следы сохраняются в камне миллионы лет. По ним учёные узнают, как динозавр ходил и какого был размера.</span></div>
            </div>
            <button class="primary fossil-summary-next" data-act="${afterChest?'to-birds':'to-cat'}">К следующей миссии →</button>
          </div>
        </div>
      </section>`;
    celebrateStars(document.querySelector('.fossil-summary-card'));
  }

  function renderSkeleton(){
    setProgress(2);
    var cases=[
      {
        id:'tooth',
        clue:'Острый зуб',
        img:'assets/dino/finding-tooth-generated.png',
        imgClass:'fossil-clue--object',
        question:'Чей это зуб?',
        hint:'Большие острые зубы нужны были хищнику, чтобы хватать и разрывать добычу.',
        answer:'Тираннозавр',
        fact:'У тираннозавра было около 60 крупных зубов. Некоторые достигали примерно 20–30 см.',
        options:[
          ['Трицератопс','assets/dino/triceratops-new.jpg'],
          ['Тираннозавр','assets/dino/tyrannosaurus-new.jpg'],
          ['Стегозавр','assets/dino/stegosaurus-new.jpg'],
          ['Брахиозавр','assets/dino/brachiosaurus-panorama-final.png']
        ]
      },
      {
        id:'frill',
        clue:'Костяной воротник',
        img:'assets/dino/finding-frill-generated.png',
        imgClass:'fossil-clue--object',
        question:'У какого динозавра был такой воротник?',
        hint:'Он защищал шею и голову и находился сразу за рогами.',
        answer:'Трицератопс',
        fact:'Костяной воротник трицератопса был частью черепа и мог служить защитой и для демонстрации.',
        options:[
          ['Брахиозавр','assets/dino/brachiosaurus-panorama-final.png'],
          ['Стегозавр','assets/dino/stegosaurus-new.jpg'],
          ['Трицератопс','assets/dino/triceratops-new.jpg'],
          ['Тираннозавр','assets/dino/tyrannosaurus-new.jpg']
        ]
      },
      {
        id:'plates',
        clue:'Пластины на спине',
        img:'assets/dino/finding-plate-generated.png',
        imgClass:'fossil-clue--plates',
        question:'Кому принадлежали такие пластины?',
        hint:'Большие костяные пластины шли двумя рядами вдоль спины.',
        answer:'Стегозавр',
        fact:'Пластины стегозавра были пронизаны кровеносными сосудами и, вероятно, помогали обмениваться теплом.',
        options:[
          ['Тираннозавр','assets/dino/tyrannosaurus-new.jpg'],
          ['Трицератопс','assets/dino/triceratops-new.jpg'],
          ['Брахиозавр','assets/dino/brachiosaurus-panorama-final.png'],
          ['Стегозавр','assets/dino/stegosaurus-new.jpg']
        ]
      }
    ];
    var done=state.skeleton>=cases.length;
    if(done){
      renderFossilComplete();
      return;
    }
    var c=cases[state.skeleton];
    var solved=!!state.skeletonSolved;
    var dots=[0,1,2].map(function(i){return '<i class="'+(i<state.skeleton?'done':i===state.skeleton?'active':'')+'"></i>';}).join('');
    var options=c.options.map(function(o){
      var cls='fossil-choice';
      if(solved&&o[0]===c.answer)cls+=' correct';
      return '<button type="button" class="'+cls+' fossil-choice--text" data-act="fossil-answer" data-value="'+o[0]+'" '+(solved?'disabled':'')+'><span>'+o[0]+'</span></button>';
    }).join('');
    app.innerHTML='<section class="panel fossil-mission-panel"><div class="stage-head"><strong>МИССИЯ 2 · ПАЛЕОНТОЛОГИЧЕСКОЕ РАССЛЕДОВАНИЕ</strong><a class="stage-home" href="index.html">← Карта</a><span class="stage-count">'+state.skeleton+' из 3</span></div><div class="stage-body">'+
      '<div class="fossil-task"><div class="fossil-task-icon">🔎</div><div><h2>Определи динозавра по находке</h2><p><b>Рассмотри находку крупным планом.</b> Вспомни признаки динозавров и выбери хозяина находки.</p></div></div>'+
      '<div class="fossil-investigation">'+
        '<div class="fossil-clue-card"><div class="fossil-clue-image '+c.imgClass+'"><img src="'+c.img+'" alt="'+c.clue+'"></div><div class="fossil-clue-copy"><small>НАХОДКА '+(state.skeleton+1)+' ИЗ 3</small><h3>'+c.clue+'</h3><p>'+c.hint+'</p></div></div>'+
        '<div class="fossil-question '+(solved?'fossil-question--solved':'')+'">'+(solved?fossilRevealMarkup(fossilRevealMeta[state.skeleton],state.skeleton===2?'Завершить →':'Следующая находка →'):'<h2>'+c.question+'</h2><div class="fossil-choices fossil-choices--text">'+options+'</div><div id="fossil-feedback" class="fossil-feedback"><span>Выбери один вариант.</span></div>')+'</div>'+
      '</div>'+
      '<div class="mission-footer fossil-footer"><span class="note">Шаг '+(state.skeleton+1)+' из 3</span><span class="step-dots">'+dots+'</span></div>'+
      '</div></section>';
  }

  function renderCatastrophe(){setProgress(3);app.innerHTML='<section class="panel catastrophe-approved"><div class="stage-head"><strong>МИССИЯ 3 · КАТАСТРОФА</strong><a class="stage-home" href="index.html">← Карта</a><span style="margin-left:auto">Спасено: <b id="cat-count">'+state.cat+'/3</b></span></div><div class="stage-body"><div class="cat-date">≈ 66 млн лет назад</div><div class="drag-scene" id="cat-scene" style="background-image:url(assets/dino/catastrophe-stage-approved-open.jpg)"><div class="chest-zone" data-drop="chest" aria-label="Контейнер палеонтолога для находок"></div><div class="cat-done cat-done-over-chest" id="cat-done" hidden><b>Готово!</b><span>Ты спас все 3 находки.</span></div><div class="fossil-tray"><div class="drag-item drag-item--plate" data-drag="plate"><img src="assets/dino/finding-plate-generated.png"><b>Пластина стегозавра</b></div><div class="drag-item" data-drag="tooth"><img src="assets/dino/finding-tooth-generated.png"><b>Зуб тираннозавра</b></div><div class="drag-item" data-drag="footprint"><img src="assets/dino/finding-footprint-cast.png"><b>Слепок следа динозавра</b></div></div></div><div class="mission-footer cat-footer-final"><div class="cat-action" id="cat-action"><b>Собери 3 находки</b> — перетащи их в контейнер справа.</div><button class="primary" id="cat-next" data-act="show-findings-summary" '+(state.cat<3?'hidden':'')+'>Дальше →</button></div></div></section>';bindDrag('.fossil-tray .drag-item','.chest-zone',function(){state.cat++;document.getElementById('cat-count').textContent=state.cat+'/3';if(state.cat>=3){var scene=document.getElementById('cat-scene');scene.classList.add('cat-complete');scene.style.backgroundImage='url(assets/dino/catastrophe-stage-approved-closed.png)';var ca=document.getElementById('cat-action');if(ca){ca.hidden=true}var done=document.getElementById('cat-done');if(done){done.hidden=false}var next=document.getElementById('cat-next');next.hidden=false;say('Готово! Ты спас все 3 находки.')}},true)}
  var birdCards=[{id:'feathered',img:'assets/dino/bird-feathered-unified.jpg',label:'Пернатый динозавр',era:'Мезозой · более 66 млн лет назад',info:'Перья появились ещё у некоторых динозавров.'},{id:'ancient',img:'assets/dino/bird-ancient-unified.jpg',label:'Древняя птица',era:'Мезозой · около 150 млн лет назад',info:'У древних птиц сочетались перья и черты динозавров.'},{id:'modern',img:'assets/dino/bird-cassowary-unified.jpg',label:'Современный казуар',era:'Наше время',info:'Современные птицы — живые потомки динозавров.'}];
  function renderBirds(){
    setProgress(4);
    if(!state.birdLearn){
      if(state.birdPhase==='look'){
        app.innerHTML='<section class="panel compact-panel birds-panel"><div class="stage-head"><strong>МИССИЯ 4 · ДИНОЗАВРЫ И ПТИЦЫ</strong><a class="stage-home" href="index.html">← Карта</a></div><div class="stage-body"><div class="birds-learn"><h1>Динозавры исчезли не совсем!</h1><p class="birds-big">Современные птицы — потомки динозавров.</p><p class="birds-step">Сначала просто рассмотри три изображения.</p><div class="bird-three bird-three--study">'+birdCards.map(function(c){return '<figure class="image-card bird-study-card">'+wrapImg(c.img,c.label)+'<figcaption><b>'+c.label+'</b><span>'+c.era+'</span><small>'+c.info+'</small></figcaption></figure>'}).join('')+'</div><div class="bird-study-note bird-study-note--lesson"><b>Что запомнить:</b> у некоторых динозавров уже были перья. Древние птицы сохранили многие черты динозавров, а современные птицы — их потомки.</div><button class="primary birds-ready" data-act="birds-ready">Я рассмотрел →</button></div></div></section>';
      }else{
        app.innerHTML='<section class="panel compact-panel birds-panel"><div class="stage-head"><strong>МИССИЯ 4 · ПРОВЕРЬ СЕБЯ</strong><a class="stage-home" href="index.html">← Карта</a></div><div class="stage-body"><div class="birds-learn"><h1>Какая из них — современная птица?</h1><p class="birds-step">Теперь выбери ответ. Подписей на картинках нет.</p><div class="bird-three bird-three--quiz">'+birdCards.map(function(c){return '<button class="bird-pick image-card" data-act="bird-learn-choice" data-value="'+c.id+'">'+wrapImg(c.img,'Вариант ответа')+'</button>'}).join('')+'</div><div id="bird-learn-result" class="bird-result"></div></div></div></section>';
      }
      return;
    }
    if(!state.birdsMixed){state.birds=shuffledIndices();state.birdsMixed=true}
    app.innerHTML='<section class="panel compact-panel birds-panel birds-order-panel chain-polish"><div class="stage-head"><strong>ИГРА · ВОССТАНОВИ ЦЕПОЧКУ</strong><a class="stage-home" href="index.html">← Карта</a></div><div class="stage-body"><div class="chain-question"><b>Что было сначала, что потом, а что сейчас?</b><span>Выбери правильный порядок событий. Нажми на две карточки, чтобы поменять их местами.</span></div><div class="order-grid bird-order-grid" id="bird-order">'+state.birds.map(function(i,pos){var c=birdCards[i];return '<div class="order-card" data-order-index="'+pos+'">'+wrapImg(c.img,'')+'<strong>'+c.label+'</strong></div>'}).join('')+'</div><div class="mission-footer chain-footer"><span class="note chain-note">💡 <span>Вспомни:</span> <b>птицы</b><span> — потомки </span><b>динозавров</b><span>.</span></span><button class="primary" data-act="check-birds">Проверить порядок</button></div><div id="birds-result"></div></div></section>';bindOrder('#bird-order',state.birds)
  }
  function renderFinalIdentify(){
    setProgress(5);
    app.innerHTML='<section class="panel compact-panel final-panel"><div class="stage-head"><strong>ФИНАЛ · ЗАДАНИЕ 1 ИЗ 2</strong><a class="stage-home" href="index.html">← Карта</a></div><div class="stage-body"><div class="final-instruction"><b>Проверь себя: кого ты узнаешь по пластинам на спине и шипам на хвосте?</b></div><div class="approved-dino-cards"><button type="button" class="approved-dino-card" data-act="final-id" data-value="Тираннозавр" aria-label="Тираннозавр"><img src="assets/dino-cards-new/tyrannosaurus.png?v=66" alt="Тираннозавр"></button><button type="button" class="approved-dino-card" data-act="final-id" data-value="Стегозавр" aria-label="Стегозавр"><img src="assets/dino-cards-new/stegosaurus.png?v=66" alt="Стегозавр"></button><button type="button" class="approved-dino-card" data-act="final-id" data-value="Трицератопс" aria-label="Трицератопс"><img src="assets/dino-cards-new/triceratops.png?v=66" alt="Трицератопс"></button></div><div id="identify-result" class="inline-feedback-wrap"></div></div></section>';
  }
  var finalCards=[
    {img:'assets/final-story-new/dinosaurs.png'},
    {img:'assets/final-story-new/catastrophe-clean.jpg'},
    {img:'assets/final-story-new/birds.png'}
  ];
  function renderFinalOrder(){
    setProgress(5);
    if(!state.finalMixed){state.finalOrder=shuffledIndices();state.finalMixed=true}
    app.innerHTML=
      '<section class="panel compact-panel final-panel final-order-panel">'+
        '<div class="stage-head"><strong>ФИНАЛ · ЗАДАНИЕ 2 ИЗ 2</strong><a class="stage-home" href="index.html">← Карта</a></div>'+
        '<div class="stage-body"><div class="final-order-content">'+
          '<div class="final-instruction final-instruction-strong"><b>Расставь события по порядку!</b><span>От самого древнего события к современному.</span></div>'+
          '<div class="final-slots-labels final-order-numbers" id="final-slots-labels"><span>1</span><i>→</i><span>2</span><i>→</i><span>3</span></div>'+
          '<div class="final-story-grid" id="final-order">'+
            state.finalOrder.map(function(i,pos){
              var c=finalCards[i];
              return '<div class="order-card final-story-card" data-order-index="'+pos+'"><img src="'+c.img+'" alt="" draggable="false"></div>';
            }).join('')+
          '</div>'+
          '<div class="mission-footer final-check-footer"><span class="note"></span><button class="primary" data-act="check-final">Проверить</button></div>'+
          '<div id="final-result" class="inline-feedback-wrap"></div>'+
        '</div></div>'+
      '</section>';
    bindOrder('#final-order',state.finalOrder)
  }

  function renderReward(){
    setProgress(6);
    localStorage.setItem('chronosphere-dino-complete','1');
    app.innerHTML='<section class="reward-native" aria-label="Экспедиция завершена"><img class="reward-native__art" src="assets/dino/reward-final-v168.jpg" alt="Мальчик и динозавры в доисторическом мире"><div class="reward-native__bottom"><div class="reward-native__copy"><h1>Экспедиция завершена!</h1><p class="reward-native__lead">Ты прошёл экспедицию и узнал,<br>как менялся мир динозавров.</p><p class="reward-native__thanks">Спасибо за твою любознательность и отвагу!</p></div><div class="reward-native__actions"><button class="reward-native__restart" data-act="restart">↻ Пройти ещё раз</button><a class="reward-native__home" href="index.html">Вернуться на Карту времени →</a></div></div></section>';
  }

  app.addEventListener('click',function(e){
    var b=e.target.closest('[data-act="final-id"]');
    if(!b)return;
    e.stopImmediatePropagation();
    var result=document.getElementById('identify-result');
    if(b.dataset.value==='Стегозавр'){
      document.querySelectorAll('.approved-dino-card').forEach(function(card){
        card.disabled=true;
        if(card.dataset.value==='Стегозавр')card.classList.add('correct');
      });
      result.innerHTML='<div class="success success-stars"><p><strong>Верно!</strong> Это стегозавр.</p><button class="primary" data-act="to-final-order">Последнее задание →</button></div>';
      celebrateStars();
    }else{
      b.classList.remove('wrong');
      void b.offsetWidth;
      b.classList.add('wrong');
      setTimeout(function(){b.classList.remove('wrong')},650);
    }
  });
  app.addEventListener('click',function(e){
    var b=e.target.closest('[data-act="check-final"]');
    if(!b)return;
    e.stopImmediatePropagation();
    var result=document.getElementById('final-result');
    if(state.finalOrder.join('')==='012'){
      b.disabled=true;
      var labels=document.getElementById('final-slots-labels');if(labels){labels.classList.remove('final-order-numbers');labels.classList.add('final-order-dates');labels.innerHTML='<span>≈230 млн лет назад</span><span>≈66 млн лет назад</span><span>Сегодня</span>';}result.innerHTML='<div class="success success-stars final-success-with-reward"><div class="final-success-copy"><p class="final-order-success"><strong>Отлично! Ты правильно расставил все события.</strong></p><p class="final-timeline-reveal"><strong>Динозавры → катастрофа → птицы.</strong></p></div><button class="primary reward-cta reward-cta--inline" data-act="reward">🏆 К НАГРАДЕ! →</button></div>';
      var nextNav=document.getElementById('slide-next');if(nextNav){nextNav.disabled=true;nextNav.removeAttribute('data-act');nextNav.style.display='none';}
      celebrateStars();
    }else{
      result.innerHTML='<div class="inline-feedback try final-order-feedback"><strong>Пока не так.</strong> Попробуй поменять карточки местами.</div>';
    }
  });
  app.addEventListener('click',function(e){var b=e.target.closest('[data-act]');if(!b)return;var a=b.dataset.act;if(a==='start'){state.screen='learn';render();return}if(a==='feature'){var idx=Number(b.dataset.feature),d=dinos[state.learn],seen=state.learnSeen[d.id]||[];if(idx!==seen.length)return;seen.push(idx);state.learnSeen[d.id]=seen;state.activeFeature=idx;renderLearn();return}if(a==='feature-next'){return}if(a==='dino-answer'){var d=dinos[state.learn],feedback=document.getElementById('learn-feedback');if(b.dataset.value===d.answer){document.querySelectorAll('.answer').forEach(function(x){x.disabled=true;if(x.dataset.value===d.answer)x.classList.add('correct')});feedback.innerHTML='<strong>Верно!</strong> '+d.name+'.';feedback.className='learn-feedback ok';document.querySelector('[data-act="learn-next"]').hidden=false;say('Верно!')}else{b.classList.add('wrong');b.disabled=true;feedback.textContent='Не тот. Попробуй ещё раз.';feedback.className='learn-feedback try';say('Попробуй ещё раз')}return}if(a==='learn-next'){state.activeFeature=null;if(state.learn<3){state.learn++;render()}else{state.screen='identify';render()}return}if(a==='puzzle-piece'){state.puzzleSelected=Number(b.dataset.piece);renderIdentify();return}if(a==='puzzle-slot'){var slot=Number(b.dataset.slot);if(state.puzzleSelected===null){return}if(slot===state.puzzleSelected){if(state.puzzlePlaced.indexOf(slot)<0)state.puzzlePlaced.push(slot);state.puzzleSelected=null;renderIdentify();if(state.puzzlePlaced.length===4){celebrateStars(document.querySelector('.puzzle-board'))}return}var wrong=document.querySelector('.puzzle-piece[data-piece="'+state.puzzleSelected+'"]');if(wrong){wrong.classList.remove('wrong-piece');void wrong.offsetWidth;wrong.classList.add('wrong-piece');var badge=document.createElement('span');badge.className='puzzle-wrong-badge';badge.textContent='Неправильно!';wrong.appendChild(badge);setTimeout(function(){badge.remove();wrong.classList.remove('wrong-piece')},700)}return}if(a==='to-skeleton'){state.screen='skeleton';state.skeleton=0;state.skeletonSolved=false;render();return}if(a==='fossil-answer'){if(state.skeletonSolved)return;var casesAnswers=['Тираннозавр','Трицератопс','Стегозавр'];var correct=casesAnswers[state.skeleton];var fb=document.getElementById('fossil-feedback');if(b.dataset.value===correct){state.skeletonSolved=true;renderSkeleton();celebrateStars(document.querySelector('.fossil-question'));say('Верно!')}else{b.classList.remove('wrong','fossil-shake');void b.offsetWidth;b.classList.add('wrong','fossil-shake');var oldBadge=b.querySelector('.fossil-wrong-badge');if(oldBadge)oldBadge.remove();var badge=document.createElement('span');badge.className='fossil-wrong-badge';badge.textContent='Не тот — выбери другой';b.appendChild(badge);fb.innerHTML='';setTimeout(function(){badge.remove();b.classList.remove('wrong','fossil-shake')},850)}return}if(a==='fossil-next'){if(state.skeleton===2){state.skeleton=3;state.skeletonSolved=false;state.screen='catastrophe';render();return}state.skeleton++;state.skeletonSolved=false;render();return}if(a==='to-cat'){state.screen='catastrophe';render();return}if(a==='show-findings-summary'){state.screen='skeleton';render();return}if(a==='to-birds'){state.screen='birds';state.birdLearn=false;state.birdPhase='look';render();return}if(a==='birds-ready'){state.birdPhase='quiz';renderBirds();return}if(a==='bird-learn-choice'){var r=document.getElementById('bird-learn-result');if(b.dataset.value==='modern'){document.querySelectorAll('[data-act="bird-learn-choice"]').forEach(function(x){x.disabled=true;if(x.dataset.value==='modern')x.classList.add('correct')});r.innerHTML='<div class="success success-stars"><h3>Верно!</h3><p>Это современный казуар — птица, потомок динозавров.</p><a class="primary bird-continue" href="birds-game.html">Продолжить →</a></div>';celebrateStars()}else{b.classList.add('wrong');b.disabled=true;r.innerHTML='<div class="inline-feedback try">Не она. Посмотри ещё раз на форму тела и перья.</div>';}return}if(a==='birds-game'){state.birdLearn=true;state.birdPhase='game';renderBirds();return}if(a==='check-birds'){if(state.birds.join('')==='012'){document.getElementById('birds-result').innerHTML='<div class="success success-stars chain-success"><h3>Отлично! Цепочка восстановлена!</h3><p>Пернатый динозавр → древняя птица → современная птица.</p><button class="primary" data-act="to-final-order">К финальному заданию →</button></div>';celebrateStars()}else{document.getElementById('birds-result').innerHTML='<div class="inline-feedback try">Пока не так. Вспомни: сначала динозавр, затем древняя птица, потом современная.</div>'}return}if(a==='to-final-id'||a==='to-final-order'){state.screen='final-order';render();return}if(a==='final-id'){if(b.dataset.value==='Стегозавр'){document.getElementById('identify-result').innerHTML='<div class="success success-stars"><h3>Верно!</h3><p>Пластины на спине и шипы на хвосте — стегозавр.</p><button class="primary" data-act="to-final-order">Последнее задание →</button></div>';celebrateStars()}else{document.getElementById('identify-result').innerHTML='<div class="inline-feedback try">Не этот. Вспомни: нужны пластины на спине и шипы на хвосте.</div>'}return}if(a==='check-final'){if(state.finalOrder.join('')==='012'){document.getElementById('final-result').innerHTML='<div class="success success-stars"><h3>История восстановлена!</h3><p>Динозавры → катастрофа → птицы.</p><button class="primary" data-act="reward">К НАГРАДЕ! →</button></div>';celebrateStars()}else{document.getElementById('final-result').innerHTML='<div class="inline-feedback try">Пока не так. Порядок: динозавры → катастрофа → птицы.</div>'}return}if(a==='reward'){state.screen='reward';render();return}if(a==='restart'){state={screen:'intro',learn:0,learnSeen:{},activeFeature:null,skeleton:0,cat:0,birds:[0,1,2],finalOrder:[0,1,2],identifyDone:false,puzzlePlaced:[],puzzleSelected:null,birdLearn:false,birdPhase:'look'};render()}});
  document.addEventListener('keydown',function(e){if(e.altKey||e.ctrlKey||e.metaKey)return;if(e.key==='ArrowLeft'&&slidePos>0)goSlide(-1);if(e.key==='ArrowRight'&&slidePos<slideHistory.length-1)goSlide(1)});
    reset.addEventListener('click',function(){if(confirm('Начать экспедицию «Мир динозавров» заново?')){localStorage.removeItem('chronosphere-dino-complete');state={screen:'intro',learn:0,learnSeen:{},activeFeature:null,skeleton:0,cat:0,birds:[0,1,2],finalOrder:[0,1,2],identifyDone:false,puzzlePlaced:[],puzzleSelected:null,birdLearn:false,birdPhase:'look'};render()}});
  render();
})();
