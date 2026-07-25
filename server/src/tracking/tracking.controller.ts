import { Controller, Post, Body, Req, Res, Get } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { TrackingService } from './tracking.service';
import { TrackEventDto } from './dto/track-event.dto';
import { CustomEventDto } from './dto/custom-event.dto';

// Ma'lum bot/crawler'lar statistikani bulg'amasligi uchun User-Agent filtri.
// Ro'yxatga kirmagan "aqlli" botlar baribir o'tishi mumkin — bu minimal himoya.
const BOT_UA_RE =
  /bot|crawl|spider|slurp|headless|phantomjs|lighthouse|pagespeed|pingdom|uptimerobot|statuscake|facebookexternalhit|bingpreview|semrush|ahrefs|mj12bot|dotbot|petalbot|bytespider|python-requests|python-urllib|go-http-client|wget/i;

function isBot(req: Request): boolean {
  const ua = (req.headers['user-agent'] as string) || '';
  return BOT_UA_RE.test(ua);
}

@ApiTags('tracking')
@Controller()
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  // Ingestion is public/unauthenticated, so it keeps its own generous but
  // bounded per-IP limit rather than being fully exempt from throttling.
  @Post('track')
  @Throttle({
    short: { ttl: 1000, limit: 20 },
    medium: { ttl: 10000, limit: 100 },
  })
  @ApiOperation({ summary: 'Record a page view (called by track.js)' })
  @ApiResponse({ status: 201, description: 'Page view recorded' })
  async track(@Body() dto: TrackEventDto, @Req() req: Request) {
    if (isBot(req)) return { ok: false, reason: 'bot' };
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || '';
    return this.trackingService.track(dto, ip);
  }

  @Post('track/event')
  @Throttle({
    short: { ttl: 1000, limit: 20 },
    medium: { ttl: 10000, limit: 100 },
  })
  @ApiOperation({
    summary: 'Record a custom event (called via metrix() JS function)',
  })
  @ApiResponse({ status: 201, description: 'Custom event recorded' })
  async trackEvent(@Body() dto: CustomEventDto, @Req() req: Request) {
    if (isBot(req)) return { ok: false, reason: 'bot' };
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || '';
    return this.trackingService.trackEvent(dto, ip);
  }

  @ApiExcludeEndpoint()
  @Get('track.js')
  @SkipThrottle({ short: true, medium: true, long: true })
  serveScript(@Res() res: Response) {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const script = `(function(){
  var s=document.currentScript;
  var key=s&&s.getAttribute('data-site');
  if(!key)return;
  // Avtomatlashtirilgan brauzerlar (Selenium/Puppeteer va h.k.) hisoblanmaydi
  if(navigator.webdriver)return;

  // ─── Helpers ─────────────────────────────────────────────
  function getDevice(){
    return /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent)?'mobile':'desktop';
  }
  function getBrowser(){
    var u=navigator.userAgent;
    if(/Edg/i.test(u))return'Edge';
    if(/Chrome/i.test(u))return'Chrome';
    if(/Firefox/i.test(u))return'Firefox';
    if(/Safari/i.test(u))return'Safari';
    return'Other';
  }
  function getUtm(){
    var p=new URLSearchParams(location.search);
    return{
      utmSource:p.get('utm_source'),
      utmMedium:p.get('utm_medium'),
      utmCampaign:p.get('utm_campaign'),
      utmTerm:p.get('utm_term'),
      utmContent:p.get('utm_content')
    };
  }
  function getSession(){
    var k='_mtx_sid',tk='_mtx_last',now=Date.now();
    var id=localStorage.getItem(k);
    var last=parseInt(localStorage.getItem(tk)||'0',10);
    // 30 daqiqa harakatsizlikdan keyin yangi sessiya (aks holda ID abadiy yashaydi)
    if(!id||now-last>30*60*1000){
      id=crypto.randomUUID?crypto.randomUUID():'mtx-'+Math.random().toString(36).slice(2);
      localStorage.setItem(k,id);
    }
    localStorage.setItem(tk,String(now));
    return id;
  }

  // ─── Scroll depth ────────────────────────────────────────
  var maxScroll=0;
  function onScroll(){
    var h=document.documentElement;
    var pct=Math.round((window.scrollY/(h.scrollHeight-h.clientHeight||1))*100);
    if(pct>maxScroll)maxScroll=pct;
  }
  window.addEventListener('scroll',onScroll,{passive:true});

  // ─── Time on page ────────────────────────────────────────
  var startTime=Date.now();

  // ─── Send pageview ───────────────────────────────────────
  function send(extra){
    var utm=getUtm();
    var payload=Object.assign({
      siteKey:key,
      path:location.pathname,
      sessionId:getSession(),
      referrer:document.referrer||null,
      device:getDevice(),
      browser:getBrowser()
    },utm,extra||{});
    // sendBeacon exit eventda ishlatiladi (sahifa yopilayotganda)
    var body=JSON.stringify(payload);
    if(extra&&extra.isExit&&navigator.sendBeacon){
      navigator.sendBeacon('${appUrl}/track',new Blob([body],{type:'application/json'}));
    }else{
      fetch('${appUrl}/track',{method:'POST',headers:{'Content-Type':'application/json'},body:body,keepalive:true});
    }
  }

  // ─── Exit event ──────────────────────────────────────────
  // Har bir exit faqat oxirgi exitdan beri o'tgan vaqtni yuboradi (server
  // duration'ni increment qiladi) — tab bir necha marta yashirilsa ham
  // vaqt ikki marta hisoblanmaydi va yashirin turgan vaqt qo'shilmaydi.
  function onExit(){
    if(startTime===null)return;
    var dur=Math.round((Date.now()-startTime)/1000);
    startTime=null;
    send({isExit:true,duration:dur,scrollDepth:Math.min(maxScroll,100)});
  }
  window.addEventListener('visibilitychange',function(){
    if(document.visibilityState==='hidden'){onExit();}
    else if(startTime===null){startTime=Date.now();}
  });
  window.addEventListener('pagehide',onExit);

  // ─── SPA support ─────────────────────────────────────────
  var lastPath=location.pathname;
  function onNav(){
    if(location.pathname!==lastPath){
      onExit();
      startTime=Date.now();
      maxScroll=0;
      lastPath=location.pathname;
      send();
    }
  }
  var orig=history.pushState;
  history.pushState=function(){orig.apply(this,arguments);onNav();};
  window.addEventListener('popstate',onNav);

  // ─── Initial pageview ────────────────────────────────────
  send();

  // ─── Public API: metrix('EventName', { prop: value }) ────
  window.metrix=function(eventName,props){
    if(!eventName)return;
    fetch('${appUrl}/track/event',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        siteKey:key,
        name:String(eventName),
        sessionId:getSession(),
        path:location.pathname,
        properties:props||null
      })
    });
  };
})();`;

    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(script);
  }
}
