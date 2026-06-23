import { Controller, Post, Body, Req, Res, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
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

@ApiTags('tracking')
@Controller()
@SkipThrottle({ short: true, medium: true, long: true })
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Post('track')
  @ApiOperation({ summary: 'Record a page view (called by track.js)' })
  @ApiResponse({ status: 201, description: 'Page view recorded' })
  async track(@Body() dto: TrackEventDto, @Req() req: Request) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || '';
    return this.trackingService.track(dto, ip);
  }

  @Post('track/event')
  @ApiOperation({ summary: 'Record a custom event (called via metrix() JS function)' })
  @ApiResponse({ status: 201, description: 'Custom event recorded' })
  async trackEvent(@Body() dto: CustomEventDto, @Req() req: Request) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || '';
    return this.trackingService.trackEvent(dto, ip);
  }

  @ApiExcludeEndpoint()
  @Get('track.js')
  serveScript(@Res() res: Response) {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const script = `(function(){
  var s=document.currentScript;
  var key=s&&s.getAttribute('data-site');
  if(!key)return;

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
    var k='_mtx_sid';
    var id=localStorage.getItem(k);
    if(!id){id=crypto.randomUUID?crypto.randomUUID():'mtx-'+Math.random().toString(36).slice(2);localStorage.setItem(k,id);}
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
  function onExit(){
    var dur=Math.round((Date.now()-startTime)/1000);
    send({isExit:true,duration:dur,scrollDepth:Math.min(maxScroll,100)});
  }
  window.addEventListener('visibilitychange',function(){
    if(document.visibilityState==='hidden')onExit();
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
