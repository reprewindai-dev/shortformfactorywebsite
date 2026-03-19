(function(){
  const calculator = document.getElementById('calculateROI');
  const roiResults = document.getElementById('roiResults');
  if(calculator){
    calculator.addEventListener('click', () => {
      const currentVideos = parseInt(document.getElementById('currentVideos').value) || 10;
      const avgViews = parseInt(document.getElementById('avgViews').value) || 1000;
      const conversionRate = parseFloat(document.getElementById('conversionRate').value) || 2;
      const avgOrderValue = parseFloat(document.getElementById('avgOrderValue').value) || 100;
      const pkg = document.getElementById('servicePackage').value;

      const pricePerVideo = { basic:25, standard:60, premium:140 }[pkg] || 60;
      const monthlyInvestment = currentVideos * pricePerVideo;
      const currentRevenue = currentVideos * avgViews * (conversionRate/100) * avgOrderValue;
      const projectedRevenue = currentVideos * (avgViews*2.5) * ((conversionRate*1.8)/100) * avgOrderValue;
      const netProfit = projectedRevenue - monthlyInvestment;
      const roi = monthlyInvestment ? ((netProfit - monthlyInvestment)/monthlyInvestment)*100 : 0;

      document.getElementById('currentRevenue').textContent = `$${currentRevenue.toLocaleString()}`;
      document.getElementById('projectedRevenue').textContent = `$${projectedRevenue.toLocaleString()}`;
      document.getElementById('monthlyInvestment').textContent = `$${monthlyInvestment.toLocaleString()}`;
      document.getElementById('netProfit').textContent = `$${netProfit.toLocaleString()}`;
      document.getElementById('roiPercentage').textContent = `${roi.toFixed(1)}%`;
      roiResults?.classList.add('show');
    });
  }

  const canvas = document.getElementById('demoCanvas');
  if(!canvas) return;

  const ctx = canvas.getContext('2d');
  const captionPrimary = document.getElementById('captionPrimary');
  const captionAccent = document.getElementById('captionAccent');
  const progressBar = document.querySelector('#demoProgress span');
  const progressTrack = document.getElementById('demoProgress');
  const presetButtons = document.querySelectorAll('#demoPresets .demo-preset-btn');
  const replayBtn = document.getElementById('demoReplay');

  const CAPTION_SETS = {
    creator: {
      primary: ['STOP SCROLLING', 'HOOK YOUR AUDIENCE', 'TURN VIEWS INTO CLIENTS'],
      accent: ['Caption stack w/ neon stroke', 'Auto emoji pacing']
    },
    coach: {
      primary: ['COACH MODE ENGAGED', 'TEACH VISUALLY', 'DROP ACTION STEPS'],
      accent: ['Gradient blocks for clarity', 'Double-line subtitles']
    },
    agency: {
      primary: ['AGENCY SPLIT SCREEN', 'CLIENT LOGO LOCKUP', 'CASE STUDY CTA'],
      accent: ['Lower-third ticker', 'Color-matched overlays']
    }
  };

  const PRESETS = {
    creator: { bg: ['#040404','#101010'], accent:'#C6FF40', subject:'#111', stickers:['#8CFF00','#FF7AF6'] },
    coach: { bg: ['#050015','#140534'], accent:'#7FD0FF', subject:'#090218', stickers:['#7FD0FF','#F9E44D'] },
    agency: { bg: ['#020b14','#041c2e'], accent:'#FFB347', subject:'#03101b', stickers:['#FFB347','#5CFFE8'] }
  };

  const toggles = {
    captions: document.getElementById('toggleCaptions'),
    broll: document.getElementById('toggleBroll'),
    color: document.getElementById('toggleColor'),
    stickers: document.getElementById('toggleStickers')
  };

  const state = { preset:'creator', elapsed:0, duration:24, captionIndex:0, accentIndex:0 };

  function setPreset(next){
    state.preset = next;
    state.captionIndex = 0;
    state.accentIndex = 0;
    captionPrimary.textContent = CAPTION_SETS[next].primary[0];
    captionAccent.textContent = CAPTION_SETS[next].accent[0];
    presetButtons.forEach(btn=>btn.classList.toggle('active', btn.dataset.preset===next));
  }

  presetButtons.forEach(btn=>btn.addEventListener('click', ()=> setPreset(btn.dataset.preset)));
  Object.values(toggles).forEach(toggle=>{
    toggle?.addEventListener('change', ()=>{
      if(toggle === toggles.captions){
        document.querySelector('.demo-caption-overlay').style.display = toggle.checked ? 'flex' : 'none';
      }
    });
  });
  replayBtn?.addEventListener('click', ()=> state.elapsed = 0);

  let lastTs = 0;
  function drawFrame(){
    const preset = PRESETS[state.preset];
    const gradient = ctx.createLinearGradient(0,0,canvas.width,canvas.height);
    gradient.addColorStop(0,preset.bg[0]);
    gradient.addColorStop(1,preset.bg[1]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0,0,canvas.width,canvas.height);

    if(toggles.broll?.checked){
      for(let i=0;i<3;i++){
        const offset = (state.elapsed*20 + i*120) % (canvas.width+200) - 200;
        ctx.fillStyle = `rgba(255,255,255,${0.04 + i*0.02})`;
        ctx.fillRect(offset, 40 + i*70, 160, 50);
      }
    }

    ctx.fillStyle = preset.subject;
    ctx.beginPath();
    ctx.roundRect(40,60,240,240,32);
    ctx.fill();

    if(toggles.color?.checked){
      const colorGrad = ctx.createLinearGradient(40,60,280,300);
      colorGrad.addColorStop(0,'rgba(255,255,255,0.02)');
      colorGrad.addColorStop(1, preset.accent+'33');
      ctx.fillStyle = colorGrad;
      ctx.fill();
    }

    if(toggles.stickers?.checked){
      ctx.fillStyle = preset.stickers[0];
      ctx.fillRect(canvas.width-180, 60, 140, 40);
      ctx.fillStyle = '#000';
      ctx.font = 'bold 16px "Space Grotesk"';
      ctx.textBaseline = 'middle';
      ctx.fillText('Tap to book', canvas.width-160, 80);

      ctx.fillStyle = preset.stickers[1];
      ctx.beginPath();
      ctx.arc(canvas.width-80, 190 + Math.sin(state.elapsed/4)*8, 26, 0, Math.PI*2);
      ctx.fill();
    }

    if(toggles.captions?.checked){
      const captions = CAPTION_SETS[state.preset];
      state.captionIndex = Math.floor((state.elapsed/4) % captions.primary.length);
      state.accentIndex = Math.floor((state.elapsed/6) % captions.accent.length);
      captionPrimary.textContent = captions.primary[state.captionIndex];
      captionAccent.textContent = captions.accent[state.accentIndex];
    }

    const progress = (state.elapsed % state.duration) / state.duration;
    progressBar.style.width = `${Math.min(100, progress*100)}%`;
    const seconds = Math.floor(state.elapsed % state.duration);
    const timestamp = `00:${seconds.toString().padStart(2,'0')} / 00:${state.duration.toString().padStart(2,'0')}`;
    progressTrack?.setAttribute('data-timestamp', timestamp);
  }

  function loop(ts){
    if(!lastTs) lastTs = ts;
    const delta = ts - lastTs;
    lastTs = ts;
    state.elapsed += delta/1000;
    drawFrame();
    requestAnimationFrame(loop);
  }

  setPreset('creator');
  requestAnimationFrame(loop);
})();
