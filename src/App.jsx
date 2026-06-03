import { useState, useEffect, useCallback, useRef } from "react";
import { PieChart, Pie, Cell, Tooltip, AreaChart, Area, XAxis, YAxis, LineChart, Line, ResponsiveContainer } from "recharts";


// ─── Supabase Client ──────────────────────────────────────────────────────────
const SUPA_URL = "YOUR_SUPABASE_URL";
const SUPA_KEY = "YOUR_SUPABASE_PUBLISHABLE_KEY";

async function supaFetch(path, options={}) {
  const res = await fetch(SUPA_URL + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPA_KEY,
      "Authorization": "Bearer " + (localStorage.getItem("talon_token") || SUPA_KEY),
      ...(options.headers||{})
    }
  });
  return res.json();
}

async function signUp(email, password, userData) {
  const res = await fetch(SUPA_URL + "/auth/v1/signup", {
    method: "POST",
    headers: {"Content-Type":"application/json","apikey":SUPA_KEY},
    body: JSON.stringify({email, password})
  });
  const data = await res.json();
  if (data.access_token) {
    localStorage.setItem("talon_token", data.access_token);
    localStorage.setItem("talon_user_id", data.user.id);
    localStorage.setItem("talon_email", email);
    await saveUserProfile(data.user.id, {...userData, email});
  }
  return data;
}

async function signIn(email, password) {
  const res = await fetch(SUPA_URL + "/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: {"Content-Type":"application/json","apikey":SUPA_KEY},
    body: JSON.stringify({email, password})
  });
  const data = await res.json();
  if (data.access_token) {
    localStorage.setItem("talon_token", data.access_token);
    localStorage.setItem("talon_user_id", data.user.id);
    localStorage.setItem("talon_email", email);
  }
  return data;
}

async function saveUserProfile(userId, userData) {
  await supaFetch("/rest/v1/users", {
    method: "POST",
    headers: {"Prefer":"resolution=merge-duplicates"},
    body: JSON.stringify({
      id: userId,
      email: userData.email,
      name: userData.name||"",
      age: userData.age||"",
      income: userData.income||"",
      debt: userData.debt||"",
      ef: userData.ef||"",
      retire_saving: userData.retireSaving||"",
      knowledge: userData.knowledge||"",
      plan: userData.plan||"free"
    })
  });
}

async function saveScore(userId, scoreData) {
  await supaFetch("/rest/v1/scores", {
    method: "POST",
    headers: {"Prefer":"resolution=merge-duplicates"},
    body: JSON.stringify({
      user_id: userId,
      score_total: scoreData.total,
      breakdown: scoreData.breakdown,
      updated_at: new Date().toISOString()
    })
  });
}

async function saveProgress(userId, {completedCh, badges, points, streak}) {
  await supaFetch("/rest/v1/progress", {
    method: "POST",
    headers: {"Prefer":"resolution=merge-duplicates"},
    body: JSON.stringify({
      user_id: userId,
      completed_chapters: Object.keys(completedCh||{}),
      badges: badges||[],
      points: points||0,
      streak: streak||0,
      last_active: new Date().toISOString().split("T")[0],
      updated_at: new Date().toISOString()
    })
  });
}

async function loadUserData(userId) {
  const [profile, score, progress] = await Promise.all([
    supaFetch("/rest/v1/users?id=eq."+userId+"&limit=1"),
    supaFetch("/rest/v1/scores?user_id=eq."+userId+"&order=updated_at.desc&limit=1"),
    supaFetch("/rest/v1/progress?user_id=eq."+userId+"&limit=1")
  ]);
  return {
    profile: profile[0]||null,
    score: score[0]||null,
    progress: progress[0]||null
  };
}

function getStoredAuth() {
  return {
    token: localStorage.getItem("talon_token"),
    userId: localStorage.getItem("talon_user_id"),
    email: localStorage.getItem("talon_email")
  };
}

function clearAuth() {
  localStorage.removeItem("talon_token");
  localStorage.removeItem("talon_user_id");
  localStorage.removeItem("talon_email");
}

const C = {
  bg:"#070e1c",nav:"#050c18",card:"#0c1a2e",card2:"#102238",
  gold:"#c9a227",goldDim:"rgba(201,162,39,0.12)",goldBorder:"rgba(201,162,39,0.22)",
  text:"#e8e5da",muted:"rgba(232,229,218,0.42)",dim:"rgba(232,229,218,0.2)",
  border:"rgba(255,255,255,0.07)",green:"#22c55e",red:"#ef4444",blue:"#60a5fa",purple:"#a78bfa",
};

const LOAD_MSGS = [
  "Teaching the AI not to panic sell…",
  "Asking Warren Buffett for a second opinion…",
  "Removing all the get-rich-quick stuff…",
  "Running the numbers your bank hopes you never see…",
  "Consulting the ghost of Benjamin Franklin…",
  "Making sure Dave Ramsey doesn't find out…",
  "Translating Wall Street nonsense into English…",
  "Checking if your portfolio sparks joy…",
  "Bribing the market data with compliments…",
  "Hiding this from your student loan servicer…",
  "Asking the Federal Reserve nicely to cooperate…",
  "Calculating exactly how much your daily coffee costs over 30 years… brace yourself…",
  "Removing all mentions of the word YOLO from your investment strategy…",
  "Verifying you are not about to do something your future self will regret…",
  "Telling the algorithm to calm down…",
];

const FOUNDING = {
  student: {name:"Founding Student",price:2.99,regular:3.99,spots:97,color:"#a78bfa"},
  core:    {name:"Founding Core",   price:4.99,regular:7.99,spots:89,color:C.green},
  pro:     {name:"Founding Pro",    price:9.99,regular:17.99,spots:76,color:C.gold},
  life:    {name:"Founding Life",   price:19.99,regular:34.99,spots:91,color:C.blue},
  family:  {name:"Founding Family", price:29.99,regular:54.99,spots:94,color:"#f97316"},
  lifetime:{name:"Founding Lifetime",price:147,regular:397,spots:83,color:"#c13584",once:true},
};

const AFFS = {
  robinhood:   {name:"Robinhood",   url:"https://robinhood.com",   cta:"Get a free stock when you open an account",icon:"🎯"},
  acorns:      {name:"Acorns",      url:"https://acorns.com",      cta:"Start investing automatically with just $5",icon:"🌱"},
  fidelity:    {name:"Fidelity",    url:"https://fidelity.com",    cta:"Open your free Roth IRA today",icon:"🛡️"},
  policygenius:{name:"Policygenius",url:"https://policygenius.com",cta:"Compare life insurance in 5 minutes",icon:"☂️"},
  creditkarma: {name:"Credit Karma",url:"https://creditkarma.com", cta:"Check your credit score free",icon:"📊"},
  sofi:        {name:"SoFi",        url:"https://sofi.com",        cta:"High-yield savings at 4.5% APY",icon:"🏦"},
  betterment:  {name:"Betterment",  url:"https://betterment.com",  cta:"Start investing automatically today",icon:"📈"},
  turbotax:    {name:"TurboTax",    url:"https://turbotax.intuit.com",cta:"File taxes and maximize your refund",icon:"💼"},
  fundrise:    {name:"Fundrise",    url:"https://fundrise.com",    cta:"Invest in real estate starting at $10",icon:"🏠"},
  ynab:        {name:"YNAB",        url:"https://youneedabudget.com",cta:"34-day free trial — budgeting that works",icon:"📋"},
  rakuten:     {name:"Rakuten",     url:"https://rakuten.com",     cta:"Get cashback on everything you buy",icon:"💰"},
  lendingclub: {name:"LendingClub", url:"https://lendingclub.com", cta:"Consolidate debt at a lower rate",icon:"⛓️"},
  coinbase:    {name:"Coinbase",    url:"https://coinbase.com",    cta:"Get $10 in Bitcoin when you buy $100",icon:"₿"},
  greenlight:  {name:"Greenlight",  url:"https://greenlight.com",  cta:"Teach your kids money with a real debit card",icon:"👨‍👩‍👧"},
  smartasset:  {name:"SmartAsset",  url:"https://smartasset.com",  cta:"Find a vetted financial advisor near you",icon:"🤝"},
  trustwill:   {name:"Trust & Will",url:"https://trustandwill.com",cta:"Create your will online in 20 minutes",icon:"📜"},
  nerdwallet:  {name:"NerdWallet",  url:"https://nerdwallet.com",  cta:"Compare financial products side by side",icon:"🔍"},
};

const MOD_AFF = {1:"ynab",2:"sofi",3:"lendingclub",4:"nerdwallet",5:"creditkarma",6:"fidelity",7:"robinhood",8:"betterment",9:"acorns",10:"coinbase",11:"fundrise",12:"policygenius",13:"turbotax",14:"betterment",15:"trustwill",16:"lendingclub",17:"coinbase",18:"smartasset",19:"greenlight",20:"smartasset"};

const MODULES = [
  {id:1,icon:"🏗️",title:"Foundation",free:true,subtitle:"Net worth, budgeting, emergency fund",
   chapters:[{id:"1-1",title:"Net Worth: Your Financial Scoreboard",
    hook:"You can't improve what you don't measure. Most people have no idea if they're winning or losing.",
    concept:"Net worth = everything you own minus everything you owe. Assets minus liabilities. That single number is your financial snapshot.",
    realNumbers:"Assets: $12k checking + $8k 401k + $18k car = $38k. Liabilities: $5.2k credit card + $24k loans = $29.2k. Net Worth = $8,800.",
    analogy:"A business doing $1M revenue but owing $1.1M is losing. A teacher earning $45k with zero debt beats someone earning $200k drowning in debt. Income is not wealth.",
    ahaMoment:"60% of Americans live paycheck to paycheck. Most have never calculated their net worth. Measuring it puts you ahead of the majority immediately.",
    action:"Write down every asset and liability right now. Calculate your net worth. That is your starting point.",
    quiz:[{q:"What is net worth?",opts:["Your annual salary","Assets minus liabilities","Your credit score","Monthly income"],ans:1,exp:"Net worth = everything you own minus everything you owe. Income is not wealth."}]},
   {id:"1-2",title:"The 50/30/20 Rule",
    hook:"Most people spend first and try to save what's left. The wealthy save first.",
    concept:"50% to needs, 30% to wants, 20% to financial goals. Simple filter that prevents most financial disasters.",
    realNumbers:"$4,000 take-home. Needs $2,000. Wants $1,200. Goals $800. That $800/month invested from age 28 to 65 at 8% = $1.9M.",
    analogy:"Your paycheck is a pie. Cut it intentionally before you start eating or rent and subscriptions eat everything.",
    ahaMoment:"The gap between 10% and 20% savings rate is not retiring 10 years later — it's the difference between retiring comfortably and working until you can't.",
    action:"Pull last month's bank statement. Categorize every transaction as Need, Want, or Goal. Find your real percentages.",
    quiz:[{q:"In the 50/30/20 rule, what is the 20%?",opts:["Housing","Food","Financial goals","Entertainment"],ans:2,exp:"The 20% goes to financial goals — saving, investing, extra debt payments."}]}]},
  {id:2,icon:"🏦",title:"Banking",free:true,subtitle:"Stop letting your bank quietly steal from you",
   chapters:[{id:"2-1",title:"High-Yield Savings: The $1,400 Mistake",
    hook:"Your bank pays 0.01% interest. High-yield savings accounts pay 4-5%. On $30,000 that's $1,500/year for doing nothing differently.",
    concept:"A HYSA (High-Yield Savings Account) is identical to regular savings — same FDIC insurance, same access — but pays 40x to 500x more interest.",
    realNumbers:"$30k at 0.01% = $3/year. $30k at 4.75% = $1,425/year. Over 10 years: $18,000 more for the exact same money doing nothing.",
    analogy:"Keeping money at a big bank is like driving past a $2.50/gallon station to pay $6.00 because you've always gone there.",
    ahaMoment:"Big banks fund their marble lobbies and bonuses with the spread between what they earn on your deposits and the 0.01% they pay you.",
    action:"Open a HYSA at Ally, Marcus, SoFi, or Discover. 10 minutes. Transfer your emergency fund. Done.",
    quiz:[{q:"What does HYSA stand for?",opts:["High Yield Spending Account","High Yield Savings Account","High Yield Stock Account","Heavy Yield Savings"],ans:1,exp:"HYSA = High Yield Savings Account. Same FDIC protection, dramatically more interest."}]}]},
  {id:3,icon:"⛓️",title:"Debt",free:true,subtitle:"Good debt builds wealth. Bad debt destroys it.",
   chapters:[{id:"3-1",title:"Good Debt vs. Bad Debt",
    hook:"Not all debt is the enemy. Some is a tool. Most people are using the wrong tool for the wrong job.",
    concept:"Good debt finances appreciating assets (mortgages, business loans). Bad debt finances depreciating liabilities and consumed goods (credit cards, car loans).",
    realNumbers:"Mortgage at 6.5% on a home appreciating 4%/year: net cost 2.5%. Credit card at 24% on a $4,000 vacation: $5,550 total — $1,550 extra for the same trip.",
    analogy:"Good debt is a lever. Bad debt is an anchor. One amplifies your wealth. One charges rent on decisions you already made.",
    ahaMoment:"Average American household: $6,270 in credit card debt at 20% APR = $1,254/year in pure interest paid to the bank — for money already spent.",
    action:"List every debt. Mark each: does it finance something gaining or losing value? That determines your urgency.",
    quiz:[{q:"Which is an example of good debt?",opts:["Credit card vacation balance","Car loan on depreciating vehicle","Mortgage on appreciating property","Payday loan"],ans:2,exp:"A mortgage on appreciating property can be good debt — the asset gains value while the loan is repaid."}]}]},
  {id:4,icon:"🃏",title:"Credit Cards",free:true,subtitle:"Dangerous tool or free money — depends on you",
   chapters:[{id:"4-1",title:"The Minimum Payment Trap",
    hook:"Credit card companies designed minimum payments to keep you in debt for decades.",
    concept:"Minimum payments cover interest plus a tiny principal reduction — engineered debt maintenance, not elimination.",
    realNumbers:"$5,000 at 24% APR. Min $100/month: 94 months, $4,311 interest, total cost $9,311. Pay $250/month: 24 months, $993 interest. Extra $150 saves $3,318.",
    analogy:"Minimum payments are bailing a sinking boat with a teacup. Interest floods in faster than you remove it.",
    ahaMoment:"$10,000 at 22% APR on minimums: 30+ years in debt, $15,000+ in interest. The card is a subscription to debt.",
    action:"Find your card's rate and balance. Use a minimum payment calculator. Let the total interest number make you angry enough to pay more.",
    quiz:[{q:"Why do credit card companies set minimums so low?",opts:["To help customers pay faster","To maximize interest income by keeping balances high","Required by law","To compete with other banks"],ans:1,exp:"Low minimums maximize bank profit — they cover interest plus almost nothing toward principal."}]}]},
  {id:5,icon:"📊",title:"Credit Score",free:true,subtitle:"Three digits controlling your financial life",
   chapters:[{id:"5-1",title:"FICO: The Number That Rules Everything",
    hook:"Your credit score determines your mortgage rate, car loan, apartment, and sometimes your job offer.",
    concept:"FICO 300-850. Payment History 35%, Utilization 30%, Length 15%, Mix 10%, Inquiries 10%.",
    realNumbers:"$350k mortgage. Score 760+: 6.5% rate, $2,212/month. Score 620-639: 8.1%, $2,599/month. Difference over 30 years: $139,000. Same house. Same lender.",
    analogy:"Your credit score is a GPA for borrowed money. A 4.0 gets scholarships. An 800 gets the lowest rates.",
    ahaMoment:"One 30-day late payment drops your score 90-110 points and stays 7 years. Pay on time. Every time.",
    action:"Pull your free report at AnnualCreditReport.com. Check for errors — 1 in 5 reports has a mistake.",
    quiz:[{q:"What is the most important factor in your FICO score?",opts:["Utilization","Length of history","Payment history","Credit mix"],ans:2,exp:"Payment history = 35% of your FICO score. Pay on time, every time."}]}]},
  {id:6,icon:"🛡️",title:"Tax-Advantaged Accounts",free:false,subtitle:"The government is offering free money. Most decline.",
   chapters:[{id:"6-1",title:"Roth IRA: The Greatest Wealth Vehicle Ever Created",
    hook:"Pay taxes now, invest it, never pay taxes again — not at $800,000, not at withdrawal. Never.",
    concept:"Roth IRA: $7,000/year after-tax. Grows tax-free. Withdrawals 100% tax-free. Income limits: $146k single, $230k married (2024).",
    realNumbers:"$500/month age 25-65 at 8%: $1,745,503. Tax owed: $0. Same in taxable account: ~$400,000 paid in taxes. Roth wins by $400,000.",
    analogy:"Roth vs Traditional is paying taxes on the acorn or the oak tree. Always pay on the acorn.",
    ahaMoment:"If you earn under $146k and have no Roth IRA you're voluntarily declining the most generous tax gift the government offers working people.",
    action:"Open a Roth IRA at Fidelity, Vanguard, or Schwab. 15 minutes. Set up $100/month to VTI or FSKAX.",
    quiz:[{q:"When do you pay taxes on a Roth IRA?",opts:["At withdrawal","When it grows","When you contribute","Never"],ans:2,exp:"Roth contributions are after-tax — you pay upfront. Growth and withdrawals are completely tax-free."}]}]},
  {id:7,icon:"📈",title:"Investing Basics",free:false,subtitle:"What stocks are and why you should own them",
   chapters:[{id:"7-1",title:"What Is a Stock",
    hook:"You use Apple every day. Amazon delivers to your door. You have never been paid for it. Shareholders have.",
    concept:"A stock is fractional ownership in a company. You own a piece. Company profits grow — your stake grows.",
    realNumbers:"$1,000 in Apple in January 2014: over $28,000 today. 2,700% return. Zero work.",
    analogy:"Own bricks across 1,000 apartment buildings. Every month all buildings collect rent. You get your fraction. That's an index fund.",
    ahaMoment:"The S&P 500 has returned an average 10.7% annually for 100 years through every war and recession.",
    action:"Buy one fractional share of VOO or VTI. Can be $1. You are now a shareholder in hundreds of America's largest companies.",
    quiz:[{q:"What is a stock?",opts:["A loan to a company","Fractional ownership in a company","A government bond","A savings account"],ans:1,exp:"A stock is fractional ownership. As a shareholder you participate in the company's success."}]}]},
  {id:8,icon:"⚖️",title:"Portfolio Building",free:false,subtitle:"Diversification and building something that lasts",
   chapters:[{id:"8-1",title:"Diversification: The Only Free Lunch in Investing",
    hook:"In 2001 Enron employees lost their entire retirement savings — all in company stock.",
    concept:"Diversification means owning many uncorrelated assets. One going to zero costs you 0.2% in a 500-stock portfolio.",
    realNumbers:"One tech stock loses 80% (Peloton, Zoom): Portfolio A devastated. 500-stock index fund: barely registers.",
    analogy:"McDonald's doesn't collapse when one franchise fails. No single holding should be able to end your financial future.",
    ahaMoment:"85% of actively managed funds underperform the simple S&P 500 index over 15 years. The index just owns everything. And wins.",
    action:"Look at your portfolio. Any single stock over 5-10% of total? That is concentrated risk. Reduce it.",
    quiz:[{q:"What percentage of actively managed funds underperform the S&P 500 over 15 years?",opts:["25%","50%","65%","85%"],ans:3,exp:"85% of professional stock pickers underperform the simple index over 15 years."}]}]},
  {id:9,icon:"💰",title:"Dividend Investing",free:false,subtitle:"Building a portfolio that pays you to hold it",
   chapters:[{id:"9-1",title:"Dividends: Getting Paid to Wait",
    hook:"What if you owned something that mailed you a check every 90 days regardless of price?",
    concept:"Dividend: cash from company profits quarterly. Yield = dividends / price. Aristocrats: 25+ consecutive years of increases.",
    realNumbers:"$100k at 3.5% yield = $3,500/year passive cash. With DRIP and 6% appreciation over 30 years: $832,000.",
    analogy:"A dividend stock is a vending machine you own. High or low traffic — the machine pays you.",
    ahaMoment:"Coca-Cola has paid a dividend every year since 1893. Through the Great Depression, two World Wars, 2008, and COVID.",
    action:"Look up NOBL — S&P 500 Dividend Aristocrats ETF. 25+ years of consecutive dividend increases.",
    quiz:[{q:"What is a dividend?",opts:["A type of loan","Cash payment from company profits to shareholders","A stock split","A type of bond"],ans:1,exp:"Dividends are cash distributions from profits, paid to shareholders typically quarterly."}]}]},
  {id:10,icon:"🔬",title:"Advanced Investing",free:false,subtitle:"Options and tools for serious investors",
   chapters:[{id:"10-1",title:"Options: Power Tool or Account Destroyer?",
    hook:"Options are how many people blow up accounts they spent years building.",
    concept:"An option grants the right to buy (call) or sell (put) at a specific price before expiration. Pay a premium. It can expire worthless.",
    realNumbers:"Apple at $190. Call option $200 strike, 30 days, $3 premium. Apple hits $210: profit $7 on $3 — 233%. Apple flat: lose 100%.",
    analogy:"An option is a non-refundable deposit on a house at today's price for 30 days. Prices rise: profit. Hold or fall: forfeit.",
    ahaMoment:"Retail option buyers lose money on 75%+ of trades — steadily transferring wealth to institutional sellers.",
    action:"Paper trade on Thinkorswim simulator for 90 days before risking real money.",
    quiz:[{q:"What happens to an option at expiration if the stock moved against you?",opts:["You get premium back","You must buy the stock","Option expires worthless — 100% loss","Broker covers the loss"],ans:2,exp:"Options expire worthless if the stock doesn't move in your favor. You lose 100% of the premium."}]}]},
  {id:11,icon:"🏠",title:"Real Estate",free:false,subtitle:"Rent vs buy, mortgages, REITs",
   chapters:[{id:"11-1",title:"Rent vs. Buy: The Math Nobody Shows You",
    hook:"Renting is throwing money away is one of the most financially destructive myths in American culture.",
    concept:"True cost of buying: mortgage + taxes (1-2%/year) + insurance + maintenance (1%/year) + opportunity cost of down payment.",
    realNumbers:"$400k home, 20% down ($80k). True monthly cost ~$3,200. Comparable rent $2,200. Down payment at 8% for 30 years: $805,000.",
    analogy:"Rent vs buy is like leasing vs buying a car. Neither is universally right.",
    ahaMoment:"Price-to-rent ratio over 30 in most major cities means buying requires 12+ years to break even.",
    action:"Divide median home price by annual median rent in your city. Under 15: buying likely makes sense. Over 20: renting deserves consideration.",
    quiz:[{q:"Price-to-rent ratio in a city is 32. What does this suggest?",opts:["Buy immediately","Renting deserves serious consideration","Market is undervalued","Prices will fall"],ans:1,exp:"A price-to-rent ratio over 20 suggests renting may be smarter. At 32 the breakeven requires 12+ years."}]}]},
  {id:12,icon:"☂️",title:"Insurance",free:false,subtitle:"The protection most people have completely wrong",
   chapters:[{id:"12-1",title:"Term vs. Whole Life Insurance",
    hook:"Whole life is one of the most aggressively sold products in America. The commissions are enormous.",
    concept:"Term: fixed period, fixed cost, death benefit only. Whole life: adds investment component at 5-15x the cost.",
    realNumbers:"35M healthy. $500k benefit. Term 20yr: $25/month. Whole life: $350/month. Difference invested at 8% for 20 years: $190,000.",
    analogy:"Whole life for its investment component is like buying a truck for its toolbox. Buy what you need.",
    ahaMoment:"Dave Ramsey, Suze Orman, and every fee-only planner agree: buy term, invest the difference.",
    action:"Get a term life quote at Policygenius. 10 minutes.",
    quiz:[{q:"What is the main advantage of term life over whole life?",opts:["Builds cash value","Covers you forever","Same protection at a fraction of the cost","Earns investment returns"],ans:2,exp:"Term provides identical death benefit protection at dramatically lower cost."}]}]},
  {id:13,icon:"💼",title:"Small Business Finance",free:false,subtitle:"What every freelancer needs to know first",
   chapters:[{id:"13-1",title:"Self-Employment Tax: The Surprise",
    hook:"New freelancers think their tax rate matches their W-2 job. It doesn't.",
    concept:"Self-employed pay the full 15.3% SE tax (both halves of FICA) plus income tax. Quarterly estimated payments required.",
    realNumbers:"$80k gross freelance. Income tax ~$10,300. SE tax $11,304. Total ~$21,604. Effective rate 27%. Most budget 15%.",
    analogy:"Ignoring SE tax is pricing services based on W-2 take-home. Looks identical until April.",
    ahaMoment:"Solo 401k: contribute up to $69,000/year (2024) vs $23,000 traditional limit — while reducing taxable income.",
    action:"Open a savings account labeled taxes. Move 30% of every payment in immediately. Pay quarterly.",
    quiz:[{q:"Self-employed people pay Social Security and Medicare at what rate vs employees?",opts:["Same rate","Half the rate","Twice the rate — both halves","Three times"],ans:2,exp:"Employees split FICA with employer. Self-employed pay both halves — the full 15.3%."}]}]},
  {id:14,icon:"🧠",title:"Behavioral Finance",free:false,subtitle:"Your brain is working against your portfolio",
   chapters:[{id:"14-1",title:"Loss Aversion: The Bias Costing You Thousands",
    hook:"Losing $100 feels twice as bad as gaining $100 feels good. This wiring causes intelligent people to make catastrophically bad decisions.",
    concept:"Loss aversion (Kahneman, Nobel Prize): investors hold losers too long, sell winners too fast, panic-sell during downturns.",
    realNumbers:"COVID crash March 2020: down 34%. Panic-sellers locked in 34% loss. Holders: fully recovered by August 2020. $100k held = $168k by year end.",
    analogy:"Loss aversion is why people buy lottery tickets but avoid index funds. Wired for survival, not optimization.",
    ahaMoment:"Average equity fund returned 8.7%/year over 30 years. Average investor in those funds returned 4.1%. The fund worked. The behavior didn't.",
    action:"Remove investment apps from your home screen. Look at your portfolio maximum once per month.",
    quiz:[{q:"What is loss aversion?",opts:["Avoiding all investments","Feeling losses more strongly than equivalent gains","Selling at a loss","Diversifying to avoid losses"],ans:1,exp:"Loss aversion: losses feel ~2x as painful as equivalent gains feel good — causing irrational decisions."}]}]},
  {id:15,icon:"🌳",title:"Generational Wealth",free:false,subtitle:"The decisions you make today shape your family's tomorrow",
   chapters:[{id:"15-1",title:"The Compounding Chasm",
    hook:"Two people. Same salary. Same returns. One starts at 22, one at 32. The gap can never be fully closed.",
    concept:"Compound returns are exponential. The last decade of a 40-year investment contributes more than the first two combined.",
    realNumbers:"Investor A: $300/month ages 22-32 then stops. Contributed $36k. At 65: $667k. Investor B: $300/month ages 32-65. Contributed $118.8k. At 65: $573k. A wins by $94k.",
    analogy:"Planting an oak tree. Best time: 20 years ago. Second best: today.",
    ahaMoment:"$5,000 invested for a child at age 10 at 8% = $160,000 at 65. Without adding another dollar.",
    action:"Research UGMA/UTMA custodial accounts for children. Calculate what 5 more years of delay costs you.",
    quiz:[{q:"Who ends up with more at 65 at 8% returns?",opts:["Investor B who contributed far more","Investor A who started 10 years earlier","They end up equal","Impossible to determine"],ans:1,exp:"Investor A wins with $667k vs $573k despite contributing $82,800 LESS. Starting earlier wins."}]}]},
  {id:16,icon:"🎓",title:"Student Loans",free:false,subtitle:"The debt crushing a generation — and how to escape",
   chapters:[{id:"16-1",title:"The Student Loan System Nobody Explained",
    hook:"$1.7 trillion in student loan debt. Most borrowers didn't understand what they were signing.",
    concept:"Federal vs private loans, income-driven repayment (IDR), PSLF, refinancing tradeoffs, true cost of deferment.",
    realNumbers:"$40k at 6.5% federal. Standard 10yr: $454/month, $54,480 total. IDR at low income: potentially $0/month with forgiveness after 20 years.",
    analogy:"Student loans are a mortgage on your future income. Terms matter as much as the amount.",
    ahaMoment:"Refinancing federal loans to private permanently eliminates IDR, PSLF, and forbearance — often worth more than the interest savings.",
    action:"Log into studentaid.gov. Know your balances, servicer, loan types, and whether your employer qualifies for PSLF.",
    quiz:[{q:"What is the risk of refinancing federal student loans to private?",opts:["Higher rates","Permanently lose federal protections like PSLF and IDR","Shorter term","Nothing — always better to refinance"],ans:1,exp:"Refinancing federal to private is irreversible — you permanently lose IDR, PSLF, and federal forbearance."}]}]},
  {id:17,icon:"₿",title:"Crypto Basics",free:false,subtitle:"What it is, what it isn't, and how much to risk",
   chapters:[{id:"17-1",title:"Crypto: Real Asset or Speculative Gamble?",
    hook:"Crypto made millionaires and destroyed fortunes. Usually the same people, in that order.",
    concept:"Decentralized digital asset. No government backing, no FDIC insurance. Bitcoin is the original. Most altcoins are speculation.",
    realNumbers:"Bitcoin peak Dec 2017: $19,783. Trough Dec 2018: $3,236 — down 84%. Peak Nov 2021: $68,789. Trough Nov 2022: $15,599 — down 77%.",
    analogy:"Crypto is like buying stock in the internet in 1995. Enormous potential. Enormous risk. Most companies from 1995 don't exist.",
    ahaMoment:"Never allocate more to crypto than you can afford to lose 100% of without affecting your financial plan.",
    action:"If interested: Bitcoin or Ethereum only through a regulated exchange. Maximum 1-5% of portfolio.",
    quiz:[{q:"What is the recommended maximum crypto allocation for most investors?",opts:["50%","25%","1-5%","Whatever you can afford"],ans:2,exp:"Most advisors suggest 1-5% maximum — only what you can lose 100% of without impacting your plan."}]}]},
  {id:18,icon:"⚡",title:"Side Hustles",free:false,subtitle:"Every dollar from a second income stream compounds differently",
   chapters:[{id:"18-1",title:"The Second Income Playbook",
    hook:"Your employer caps your income. A side hustle doesn't.",
    concept:"Three types: time-for-money (gig work), leverage-based (digital products), asset-based (rental, dividends). Only the last two scale without your time.",
    realNumbers:"$500/month side hustle invested entirely at 8% for 10 years: $91,000. Same $500 spent: gone.",
    analogy:"Time-for-money is a second job. Leverage-based is a business. Know which you're building.",
    ahaMoment:"The most valuable side hustles solve problems you've already solved for yourself. Your expertise is someone else's urgent need.",
    action:"List three skills you have that others would pay for. Google that skill plus freelance and see the market.",
    quiz:[{q:"Which side hustle type scales without requiring more of your time?",opts:["Freelancing","Uber driving","Leverage-based — digital products","Tutoring"],ans:2,exp:"Leverage-based side hustles (digital products, content, courses) — you create once and sell repeatedly."}]}]},
  {id:19,icon:"👨‍👩‍👧",title:"Kids and Money",free:false,subtitle:"The financial education your kids aren't getting in school",
   chapters:[{id:"19-1",title:"Teaching Kids Money",
    hook:"Schools don't teach money. Parents weren't taught money. The cycle breaks here.",
    concept:"Age-appropriate education: 4-7 earn-save-spend jars, 8-12 basic investing, 13-17 budgeting and jobs, 18+ Roth IRA with earned income.",
    realNumbers:"Roth IRA at 16 with summer job: $3,000 contributed. At 8% with no additions: $97,000 at 65.",
    analogy:"Teaching a child to fish financially means they eat for a lifetime.",
    ahaMoment:"Only 22 US states require personal finance in high school. The other 28 produce financially illiterate adults by design.",
    action:"Open a custodial investment account at Fidelity or Schwab. Start with $50. Explain what you're doing.",
    quiz:[{q:"What age can a child have a Roth IRA?",opts:["16 years old","18 years old","Any age with earned income","21 years old"],ans:2,exp:"A child can have a Roth IRA at any age as long as they have earned income."}]}]},
  {id:20,icon:"🤝",title:"Negotiation",free:false,subtitle:"The skill that compounds forever",
   chapters:[{id:"20-1",title:"The Salary Conversation Worth Six Figures",
    hook:"The average person leaves $1 million in lifetime earnings on the table by not negotiating.",
    concept:"Salary negotiation compounds. A $5,000 raise at 30 affects raises, bonuses, and retirement contributions for decades.",
    realNumbers:"Offer $65k. Counter $72k. Settle $70k. That $5k over 35 years with 3% annual raises: ~$380,000 additional lifetime earnings. One conversation.",
    analogy:"Not negotiating is leaving a wallet of cash on the table because asking feels uncomfortable.",
    ahaMoment:"Employers expect negotiation. HR budgets for it. The first offer is almost never the final offer.",
    action:"Research your market rate at Glassdoor or Levels.fyi. Know the number. Practice saying it out loud.",
    quiz:[{q:"An employer makes a job offer. You're worth 10% more. What do you do?",opts:["Accept — they might rescind","Ask for time then decline","Negotiate — employers expect and budget for it","Find another employer"],ans:2,exp:"Employers almost universally expect negotiation. The worst they can say is no."}]}]},
];

const TIER_CFG = {
  1:{l:"Capital Preservation",g:"Conservative",col:"#4ade80",desc:"Near-zero volatility. Protecting principal is the only objective."},
  2:{l:"Income Focused",g:"Conservative",col:"#4ade80",desc:"Steady income from dividends and bond interest."},
  3:{l:"Conservative Growth",g:"Conservative",col:"#86efac",desc:"Defensive with a touch of growth. 80% safety, 20% upside."},
  4:{l:"Moderate",g:"Balanced",col:"#fbbf24",desc:"Classic 60/40. Foundation of most retirement portfolios."},
  5:{l:"Balanced",g:"Balanced",col:"#fbbf24",desc:"Equal parts protection and growth."},
  6:{l:"Balanced Growth",g:"Balanced",col:"#fb923c",desc:"Growth-tilted with safety net. Targeting 8-10% annually."},
  7:{l:"Growth",g:"Growth",col:"#f97316",desc:"Full equity. 10+ year horizon. No bonds."},
  8:{l:"Aggressive Growth",g:"Growth",col:"#ef4444",desc:"Concentrated high-growth. Expect violent swings."},
  9:{l:"Aggressive",g:"Aggressive",col:"#dc2626",desc:"Speculative positions, emerging markets, concentrated bets."},
  10:{l:"Maximum Risk",g:"Max Risk",col:"#b91c1c",desc:"Leveraged ETFs, crypto-adjacent. Could lose 70%+ in a crash."},
};
const PAL = ["#c9a227","#60a5fa","#4ade80","#f472b6","#a78bfa","#34d399","#fb923c","#38bdf8"];

function calcScore(d) {
  const ef={none:0,partial:5,"1mo":8,"3mo":14,"6mo":18,"12mo+":20}[d.ef]||0;
  const debt={none:20,low:17,moderate:12,heavy:6,severe:1}[d.debt]||10;
  const retire=Math.min(20,(d.retireSaving==="yes"?13:4)+({"20s":5,"30s":4,"40s":3,"50s":2,"60s":1}[d.age]||3));
  const inc={"u25k":7,"25-50k":10,"50-75k":13,"75-150k":16,"150k+":20}[d.income]||10;
  const know={beginner:4,some:8,intermediate:14,advanced:19}[d.knowledge]||4;
  return {total:Math.min(100,ef+debt+retire+inc+know),breakdown:{"Emergency Fund":ef,"Debt Health":debt,"Retirement":retire,"Income":inc,"Knowledge":know}};
}

function Pill({label,color=C.gold}){return <span style={{fontSize:10,padding:"2px 8px",borderRadius:5,background:color+"18",border:`1px solid ${color}30`,color,letterSpacing:"0.07em",fontWeight:600}}>{label}</span>;}
function SL({children}){return <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}><span style={{fontSize:10,color:C.muted,letterSpacing:"0.12em",flexShrink:0}}>{children}</span><div style={{flex:1,height:1,background:C.border}}/></div>;}
function Card({children,style={}}){return <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"18px 20px",...style}}>{children}</div>;}

function ScoreRing({score,size=160,stroke=14,hideLabel=false}){
  const R=(size-stroke)/2, circ=2*Math.PI*R, offset=circ-(score/100)*circ;
  const col=score>=70?C.green:score>=45?C.gold:C.red;
  return(
    <div style={{position:"relative",width:size,height:size}}>
      <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
        <circle cx={size/2} cy={size/2} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={R} fill="none" stroke={col} strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{transition:"stroke-dashoffset 1.4s ease"}}/>
      </svg>
      {!hideLabel && (
        <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          <span style={{fontSize:size>120?32:20,fontWeight:700,color:col,fontFamily:"monospace",lineHeight:1}}>{score}</span>
          <span style={{fontSize:9,color:C.muted,letterSpacing:"0.08em",marginTop:2}}>TALON SCORE</span>
        </div>
      )}
    </div>
  );
}

function AffCard({affKey,context=""}){
  const a=AFFS[affKey];
  if(!a) return null;
  return(
    <div style={{background:"linear-gradient(135deg,rgba(201,162,39,0.08),rgba(201,162,39,0.03))",border:`1px solid ${C.goldBorder}`,borderRadius:10,padding:"14px 16px",marginTop:14}}>
      <div style={{fontSize:9,color:C.gold,letterSpacing:"0.12em",marginBottom:8}}>TALON RECOMMENDS</div>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
        <span style={{fontSize:20}}>{a.icon}</span>
        <div><div style={{fontSize:13,fontWeight:600,color:C.text}}>{a.name}</div><div style={{fontSize:11,color:C.muted}}>{a.cta}</div></div>
      </div>
      <a href={`${a.url}?utm_source=talon&utm_campaign=${affKey}&utm_content=${context}`} target="_blank" rel="noopener noreferrer"
        style={{display:"block",textAlign:"center",padding:"9px",background:C.gold,borderRadius:7,color:"#000",fontSize:12,fontWeight:700,textDecoration:"none"}}>
        Get Started with {a.name}
      </a>
      <p style={{fontSize:9,color:C.dim,margin:"6px 0 0",textAlign:"center"}}>TALON may earn a commission at no cost to you.</p>
    </div>
  );
}

function WTFButton(){
  const [open,setOpen]=useState(false);
  const [text,setText]=useState("");
  const [sent,setSent]=useState(false);
  const close=()=>{setOpen(false);setSent(false);setText("");};
  return(
    <>
      <button onClick={()=>setOpen(true)} style={{position:"fixed",bottom:80,right:16,background:"transparent",border:"2px solid "+C.red,borderRadius:20,padding:"8px 14px",color:C.red,fontSize:12,fontWeight:800,cursor:"pointer",zIndex:50}}>WTF!?</button>
      {open && (
        <div onClick={close} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div onClick={e=>e.stopPropagation()}><Card style={{maxWidth:400,width:"100%"}}>
            {sent ? (
              <div style={{textAlign:"center",padding:"20px 0"}}>
                <div style={{fontSize:32,marginBottom:12}}>😤</div>
                <div style={{fontSize:16,fontWeight:700,color:C.text,marginBottom:8}}>We got it.</div>
                <p style={{fontSize:13,color:C.muted}}>Received, logged, and escalated to the appropriate department. Which is us. We are the department. Someone is getting yelled at right now and it is also us. We appreciate your patience and your rage.</p>
                <button onClick={close} style={{marginTop:16,padding:"9px 20px",background:C.gold,border:"none",borderRadius:8,color:"#000",fontWeight:700,cursor:"pointer"}}>Close</button>
              </div>
            ) : (
              <>
                <div style={{fontSize:10,color:C.red,letterSpacing:"0.1em",marginBottom:8}}>SOMETHING IS BROKEN</div>
                <h3 style={{fontSize:18,fontWeight:700,color:C.text,margin:"0 0 8px"}}>Oh. That was not supposed to happen.</h3>
                <p style={{fontSize:13,color:C.muted,margin:"0 0 16px",lineHeight:1.6}}>Tell us what broke. Be as specific as your feelings allow. Someone is about to have a very educational Monday morning.</p>
                <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="What went wrong? The more detail you give us the faster we fix it and the better we sleep at night." rows={4} style={{width:"100%",padding:"10px 12px",background:C.card2,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:13,outline:"none",resize:"vertical",boxSizing:"border-box"}}/>
                <div style={{display:"flex",gap:8,marginTop:12}}>
                  <button onClick={close} style={{flex:1,padding:"10px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,color:C.muted,cursor:"pointer"}}>Never mind</button>
                  <button onClick={()=>setSent(true)} disabled={!text} style={{flex:2,padding:"10px",background:text?C.red:"rgba(239,68,68,0.2)",border:"none",borderRadius:8,color:text?"white":C.muted,fontWeight:700,cursor:text?"pointer":"not-allowed"}}>Send It</button>
                </div>
              </>
            )}
          </Card></div>
        </div>
      )}
    </>
  );
}

function AICoach({userData,scoreData,plan,onUpgrade,completedCh}){
  const [open,setOpen]=useState(false);
  const [msgs,setMsgs]=useState([{role:"assistant",content:`Hey ${userData.name||"there"}! I'm your TALON Financial Coach. I know your score is ${scoreData?.total||0}/100 and your situation. Ask me anything about money — plain English, no gatekeeping. What's on your mind?`}]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const [loadMsg,setLoadMsg]=useState("");
  const endRef=useRef(null);
  useEffect(()=>{if(open) endRef.current?.scrollIntoView({behavior:"smooth"});},[msgs,open]);

  const send=async()=>{
    if(!input.trim()||loading) return;
    if(plan==="free"){onUpgrade();return;}
    const userMsg={role:"user",content:input};
    setMsgs(m=>[...m,userMsg]);
    setInput("");
    setLoading(true);
    setLoadMsg(LOAD_MSGS[Math.floor(Math.random()*LOAD_MSGS.length)]);
    const sys=`You are TALON, a financial fluency coach — not a financial advisor. Plain English, real numbers, street-level analogies. Never give specific investment advice or tell someone what to do with their money. User: Name ${userData.name||"User"}, Age ${userData.age||"unknown"}, Income ${userData.income||"unknown"}, Debt ${userData.debt||"unknown"}, EF ${userData.ef||"unknown"}, Retirement saving ${userData.retireSaving||"unknown"}, Knowledge ${userData.knowledge||"beginner"}, TALON Score ${scoreData?.total||0}/100. Always end with: "This is educational context — for decisions specific to your situation, a licensed financial advisor is your best resource." Keep responses under 200 words.`;
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-5",max_tokens:500,system:sys,messages:[...msgs,userMsg].map(m=>({role:m.role,content:m.content}))})});
      const data=await res.json();
      const reply=data.content?.filter(b=>b.type==="text").map(b=>b.text).join("")||"Something went wrong — try again.";
      setMsgs(m=>[...m,{role:"assistant",content:reply}]);
    }catch(e){setMsgs(m=>[...m,{role:"assistant",content:"Even the internet needs a break sometimes. Try again in a sec."}]);}
    setLoading(false);
  };

  return(
    <>
      <button onClick={()=>setOpen(true)} style={{position:"fixed",bottom:80,left:16,background:"transparent",border:"2px solid "+C.gold,borderRadius:20,padding:"7px 12px",color:C.gold,fontSize:11,fontWeight:800,cursor:"pointer",zIndex:50,letterSpacing:"0.05em"}}>💰 Money Coach</button>
      {open && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:100,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div style={{background:C.card,border:`1px solid ${C.goldBorder}`,borderRadius:"16px 16px 0 0",width:"100%",maxWidth:520,height:"75vh",display:"flex",flexDirection:"column"}}>
            <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><div style={{fontSize:14,fontWeight:700,color:C.gold}}>TALON Financial Coach</div><div style={{fontSize:10,color:C.muted}}>Educational guidance — not financial advice</div></div>
              <button onClick={()=>setOpen(false)} style={{background:"none",border:"none",color:C.muted,fontSize:20,cursor:"pointer"}}>x</button>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:12}}>
              {msgs.map((m,i)=>(
                <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
                  <div style={{maxWidth:"85%",padding:"10px 14px",borderRadius:m.role==="user"?"12px 12px 2px 12px":"12px 12px 12px 2px",background:m.role==="user"?C.gold:C.card2,color:m.role==="user"?"#000":C.muted,fontSize:13,lineHeight:1.7}}>{m.content}</div>
                </div>
              ))}
              {loading && <div style={{display:"flex",justifyContent:"flex-start"}}><div style={{padding:"10px 14px",borderRadius:"12px 12px 12px 2px",background:C.card2,color:C.muted,fontSize:12,fontStyle:"italic"}}>{loadMsg}</div></div>}
              <div ref={endRef}/>
            </div>
            {plan==="free" ? (
              <div style={{padding:"12px 16px",background:"rgba(201,162,39,0.08)",borderTop:`1px solid ${C.goldBorder}`,textAlign:"center"}}>
                <div style={{fontSize:12,color:C.muted,marginBottom:8}}>AI Coach unlocks with TALON Pro</div>
                <button onClick={onUpgrade} style={{padding:"8px 20px",background:C.gold,border:"none",borderRadius:8,color:"#000",fontSize:12,fontWeight:700,cursor:"pointer"}}>Upgrade to Pro</button>
              </div>
            ) : (
              <div style={{padding:"12px 16px",borderTop:`1px solid ${C.border}`,display:"flex",gap:8}}>
                <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Ask anything about money..." style={{flex:1,padding:"9px 12px",background:C.card2,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:13,outline:"none"}}/>
                <button onClick={send} disabled={!input.trim()||loading} style={{padding:"9px 16px",background:input.trim()?C.gold:"rgba(201,162,39,0.2)",border:"none",borderRadius:8,color:input.trim()?"#000":C.muted,fontWeight:700,cursor:input.trim()?"pointer":"not-allowed",fontSize:13}}>Send</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function ShareCard({score,userData}){
  const col=score>=70?C.green:score>=45?C.gold:C.red;
  const msg=score>=70?"Strong Financial Foundation":score>=45?"Building Momentum":"Starting My Journey";
  const url="https://talon.logantia.ai";
  const txt=`My TALON Financial Score: ${score}/100 — ${msg}. Building wealth with TALON. Check yours free at ${url}`;
  const ig=`Financial score: ${score}/100 ${msg}. Built my personalized financial roadmap with TALON — free at talon.logantia.ai. 60% of Americans live paycheck to paycheck. This tool is changing that. #personalfinance #financialfreedom #moneymindset #wealthbuilding #talon`;
  const tt=`60% of Americans live paycheck to paycheck — not because they are lazy, but because nobody ever taught them this. I just scored ${score} out of 100 on TALON. Here is the one thing that shocked me most. Link in bio.`;
  const [copied,setCopied]=useState(false);
  const [igCopied,setIgCopied]=useState(false);
  const [ttCopied,setTtCopied]=useState(false);
  const [showMore,setShowMore]=useState(false);
  const share=(p)=>{
    const urls={
      twitter:`https://twitter.com/intent/tweet?text=${encodeURIComponent(txt)}`,
      facebook:`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      linkedin:`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      whatsapp:`https://wa.me/?text=${encodeURIComponent(txt)}`,
      reddit:`https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent("I scored "+score+"/100 on the TALON Financial Fluency Engine")}`,
      pinterest:`https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&description=${encodeURIComponent(txt)}`,
    };
    if(urls[p]) window.open(urls[p],"_blank");
  };
  const PLAT=[
    {id:"twitter",label:"X / Twitter",color:"#1da1f2",bg:"rgba(29,161,242,0.12)",border:"rgba(29,161,242,0.3)"},
    {id:"facebook",label:"Facebook",color:"#1877f2",bg:"rgba(24,119,242,0.12)",border:"rgba(24,119,242,0.3)"},
    {id:"linkedin",label:"LinkedIn",color:"#0077b5",bg:"rgba(0,119,181,0.12)",border:"rgba(0,119,181,0.3)"},
    {id:"whatsapp",label:"WhatsApp",color:"#25d366",bg:"rgba(37,211,102,0.12)",border:"rgba(37,211,102,0.3)"},
    {id:"reddit",label:"Reddit",color:"#ff4500",bg:"rgba(255,69,0,0.12)",border:"rgba(255,69,0,0.3)"},
    {id:"pinterest",label:"Pinterest",color:"#e60023",bg:"rgba(230,0,35,0.12)",border:"rgba(230,0,35,0.3)"},
  ];
  return(
    <Card style={{borderColor:col+"30"}}>
      <div style={{fontSize:9,color:C.muted,letterSpacing:"0.1em",marginBottom:12}}>SHARE YOUR SCORE</div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14,padding:"10px 12px",background:"rgba(0,0,0,0.2)",borderRadius:9}}>
        <ScoreRing score={score} size={64} stroke={7}/>
        <div style={{flex:1}}>
          <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:2}}>{msg}</div>
          <div style={{fontSize:11,color:C.muted}}>TALON Financial Fluency — Logantia AI</div>
          <div style={{fontSize:12,color:col,fontFamily:"monospace",fontWeight:700,marginTop:3}}>{score} / 100</div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:6}}>
        {(showMore?PLAT:PLAT.slice(0,4)).map(p=>(
          <button key={p.id} onClick={()=>share(p.id)} style={{padding:"8px 6px",background:p.bg,border:`1px solid ${p.border}`,borderRadius:8,color:p.color,fontSize:11,fontWeight:600,cursor:"pointer"}}>{p.label}</button>
        ))}
      </div>
      {!showMore && <button onClick={()=>setShowMore(true)} style={{width:"100%",padding:"6px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:7,color:C.muted,fontSize:10,cursor:"pointer",marginBottom:6}}>+ Reddit and Pinterest</button>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:8}}>
        <button onClick={()=>{navigator.clipboard?.writeText(ig);setIgCopied(true);setTimeout(()=>setIgCopied(false),2500);}} style={{padding:"7px 4px",background:"rgba(193,53,132,0.12)",border:"1px solid rgba(193,53,132,0.3)",borderRadius:7,color:"#c13584",fontSize:10,fontWeight:600,cursor:"pointer"}}>📸 {igCopied?"Copied!":"Instagram"}</button>
        <button onClick={()=>{navigator.clipboard?.writeText(tt);setTtCopied(true);setTimeout(()=>setTtCopied(false),2500);}} style={{padding:"7px 4px",background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:7,color:C.text,fontSize:10,fontWeight:600,cursor:"pointer"}}>TikTok {ttCopied?"Copied!":""}</button>
        <button onClick={()=>{navigator.clipboard?.writeText(url);setCopied(true);setTimeout(()=>setCopied(false),2000);}} style={{padding:"7px 4px",background:"rgba(255,255,255,0.03)",border:`1px solid ${C.border}`,borderRadius:7,color:C.muted,fontSize:10,fontWeight:600,cursor:"pointer"}}>Link {copied?"Copied!":""}</button>
      </div>
      <p style={{fontSize:10,color:C.dim,textAlign:"center",margin:0}}>Every share helps someone who was never taught money.</p>
    </Card>
  );
}

function UpgradeModal({onClose,onSelect}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16,overflowY:"auto"}}>
      <div style={{background:C.card,border:`1px solid ${C.goldBorder}`,borderRadius:16,padding:"24px 20px",maxWidth:480,width:"100%",maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:28,fontWeight:100,letterSpacing:"0.5em",color:"#fff",fontFamily:"'Josefin Sans',sans-serif",marginBottom:4}}>TALON</div>
          <div style={{fontSize:11,color:C.gold,letterSpacing:"0.1em",marginBottom:8}}>FOUNDING MEMBER — FIRST 100 PER TIER</div>
          <p style={{fontSize:12,color:C.muted,margin:0}}>Lock in your rate forever. When we hit 100,000 users you'll still pay what you paid on day one.</p>
        </div>
        {Object.entries(FOUNDING).map(([key,tier])=>(
          <div key={key} style={{border:`1px solid ${key==="pro"?tier.color:C.border}`,borderRadius:12,padding:"14px 16px",marginBottom:8,background:key==="pro"?tier.color+"08":"transparent"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:tier.color}}>{tier.name}</div>
                <div style={{fontSize:10,color:C.dim}}>{tier.spots} of 100 spots remaining</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:20,fontWeight:800,color:C.text}}>${tier.price}</div>
                <div style={{fontSize:10,color:C.dim}}>{tier.once?"one time":"/mo locked forever"}</div>
                <div style={{fontSize:10,color:C.muted,textDecoration:"line-through"}}>${tier.regular}</div>
              </div>
            </div>
            <button onClick={()=>onSelect(key)} style={{width:"100%",padding:"9px",background:key==="pro"?tier.color:"transparent",border:`1px solid ${key==="pro"?tier.color:C.border}`,borderRadius:8,color:key==="pro"?"#000":C.text,fontSize:12,fontWeight:key==="pro"?700:400,cursor:"pointer"}}>
              {key==="pro"?"Claim Founding Pro Spot →":"Select "+tier.name}
            </button>
          </div>
        ))}
        <p style={{fontSize:10,color:C.dim,textAlign:"center",margin:"12px 0 0"}}>30-day money-back guarantee. Cancel anytime. 100 means 100.</p>
        <button onClick={onClose} style={{width:"100%",padding:"8px",background:"transparent",border:"none",color:C.dim,fontSize:11,cursor:"pointer",marginTop:8}}>Maybe later — continue with Free</button>
      </div>
    </div>
  );
}

const OB=[
  {title:"Let's start with you",sub:"Quick questions to build your personal financial picture.",fields:[{key:"name",label:"First name",type:"text",ph:"What should TALON call you?"},{key:"age",label:"Age range",type:"sel",opts:[["20s","20-29"],["30s","30-39"],["40s","40-49"],["50s","50-59"],["60s","60+"]]}]},
  {title:"Money in, money out",sub:"No judgment. Just data.",fields:[{key:"income",label:"Annual household income",type:"sel",opts:[["u25k","Under $25,000"],["25-50k","$25,000-$50,000"],["50-75k","$50,000-$75,000"],["75-150k","$75,000-$150,000"],["150k+","$150,000+"]]},{key:"debt",label:"Current debt situation",type:"sel",opts:[["none","Debt-free"],["low","Minimal (under $10k)"],["moderate","Manageable ($10k-$40k)"],["heavy","Heavy ($40k-$100k)"],["severe","Overwhelming ($100k+)"]]}]},
  {title:"Protection and the future",sub:"Where you stand on savings and security.",fields:[{key:"ef",label:"Emergency fund",type:"sel",opts:[["none","None — fully exposed"],["partial","Under 1 month"],["1mo","1 month"],["3mo","3 months"],["6mo","6 months"],["12mo+","12+ months"]]},{key:"retireSaving",label:"Actively saving for retirement?",type:"sel",opts:[["no","Not yet"],["yes","Yes — 401k, IRA, or both"]]}]},
  {title:"One last thing",sub:"This shapes how TALON communicates with you.",fields:[{key:"knowledge",label:"Financial knowledge level",type:"sel",opts:[["beginner","Beginner — learning basics"],["some","Some experience"],["intermediate","Intermediate — I invest"],["advanced","Advanced — active management"]]},{key:"email",label:"Email for free newsletter (optional)",type:"text",ph:"your@email.com"}]},
];


// ─── Auth Screen ──────────────────────────────────────────────────────────────
function AuthScreen({onAuth}) {
  const [mode,setMode]=useState("login");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");

  const handle=async()=>{
    if(!email||!password){setError("Email and password required.");return;}
    if(password.length<6){setError("Password must be at least 6 characters.");return;}
    setLoading(true);setError("");
    try{
      const data=mode==="login"?await signIn(email,password):await signUp(email,password,{email});
      if(data.access_token){
        onAuth(data.user||{id:localStorage.getItem("talon_user_id"),email});
      }else{
        setError(data.error_description||data.msg||"Something went wrong. Try again.");
      }
    }catch(e){setError("Connection error. Try again.");}
    setLoading(false);
  };

  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px 20px",fontFamily:"'SF Pro Text',-apple-system,sans-serif"}}>
      <div style={{marginBottom:28,textAlign:"center"}}>
        <div style={{fontSize:36,fontWeight:100,letterSpacing:"0.5em",color:"#fff",fontFamily:"'Josefin Sans',sans-serif",textTransform:"uppercase",marginBottom:4}}>TALON</div>
        <div style={{fontSize:9,color:C.dim,letterSpacing:"0.14em"}}>FINANCIAL FLUENCY ENGINE</div>
      </div>
      <div style={{width:"100%",maxWidth:400}}>
        <div style={{display:"flex",gap:6,marginBottom:20,background:"rgba(255,255,255,0.04)",padding:4,borderRadius:10}}>
          {["login","signup"].map(m=>(
            <button key={m} onClick={()=>{setMode(m);setError("");}} style={{flex:1,padding:"9px",background:mode===m?C.card:"transparent",border:"none",borderRadius:8,color:mode===m?C.gold:C.muted,fontSize:12,fontWeight:mode===m?700:400,cursor:"pointer"}}>
              {m==="login"?"Sign In":"Create Account"}
            </button>
          ))}
        </div>
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"24px 20px"}}>
          <h2 style={{fontSize:18,fontWeight:600,color:C.text,margin:"0 0 6px"}}>{mode==="login"?"Welcome back":"Join TALON"}</h2>
          <p style={{fontSize:12,color:C.muted,margin:"0 0 20px",lineHeight:1.6}}>{mode==="login"?"Sign in to access your financial dashboard and saved progress.":"Create your free account and start building financial fluency today."}</p>
          {error&&<div style={{padding:"9px 12px",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:7,fontSize:12,color:C.red,marginBottom:14}}>{error}</div>}
          <div style={{marginBottom:13}}>
            <label style={{display:"block",fontSize:12,color:C.muted,marginBottom:5}}>Email address</label>
            <input value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handle()} type="email" placeholder="your@email.com" style={{width:"100%",padding:"9px 12px",background:C.card2,border:`1px solid ${C.goldBorder}`,borderRadius:8,color:C.text,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
          </div>
          <div style={{marginBottom:20}}>
            <label style={{display:"block",fontSize:12,color:C.muted,marginBottom:5}}>Password</label>
            <input value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handle()} type="password" placeholder="At least 6 characters" style={{width:"100%",padding:"9px 12px",background:C.card2,border:`1px solid ${C.goldBorder}`,borderRadius:8,color:C.text,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
          </div>
          <button onClick={handle} disabled={loading} style={{width:"100%",padding:"12px",background:loading?"rgba(201,162,39,0.2)":C.gold,border:"none",borderRadius:9,color:loading?"rgba(0,0,0,0.4)":"#000",fontSize:14,fontWeight:700,cursor:loading?"not-allowed":"pointer"}}>
            {loading?"Please wait...":(mode==="login"?"Sign In":"Create Free Account")}
          </button>
          {mode==="login"&&<p style={{fontSize:11,color:C.dim,textAlign:"center",margin:"12px 0 0"}}>New to TALON? <button onClick={()=>s{()=>setMode("signup")} style={{background:"none",border:"none",color:C.gold,fontSize:11,cursor:"pointer",padding:0}}>Create a free account</button></p>}
          {mode==="signup"&&<p style={{fontSize:10,color:C.dim,textAlign:"center",margin:"12px 0 0",lineHeight:1.5}}>By creating an account you agree to our Terms of Service and Privacy Policy. TALON is for educational purposes only.</p>}
        </div>
      </div>
    </div>
  );
}

function Onboarding({onComplete}){
  const [step,setStep]=useState(0);
  const [data,setData]=useState({});
  const [agreed,setAgreed]=useState(false);
  useEffect(()=>{
    const l=document.createElement("link");
    l.rel="stylesheet";
    l.href="https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@100;300;400&display=swap";
    document.head.appendChild(l);
  },[]);
  const cur=OB[step];
  const reqFields=cur.fields.filter(f=>f.key!=="email");
  const canNext=reqFields.every(f=>data[f.key])&&(step>0||agreed);
  const set=(k,v)=>setData(p=>({...p,[k]:v}));
  const next=()=>{
    if(step<OB.length-1){setStep(s=>s+1);}else{onComplete(data);}
  };
  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px 20px",fontFamily:"'SF Pro Text',-apple-system,sans-serif"}}>
      <div style={{marginBottom:28,textAlign:"center"}}>
        <div style={{fontSize:36,fontWeight:100,letterSpacing:"0.5em",color:"#fff",fontFamily:"'Josefin Sans',sans-serif",textTransform:"uppercase",marginBottom:4}}>TALON</div>
        <div style={{fontSize:9,color:C.dim,letterSpacing:"0.14em"}}>FINANCIAL FLUENCY ENGINE — POWERED BY LOGANTIA AI</div>
      </div>
      <div style={{width:"100%",maxWidth:440}}>
        <div style={{display:"flex",gap:5,marginBottom:24}}>
          {OB.map((_,i)=><div key={i} style={{flex:1,height:3,borderRadius:2,background:i<=step?C.gold:"rgba(255,255,255,0.1)",transition:"background 0.3s"}}/>)}
        </div>
        <Card style={{marginBottom:14}}>
          <h2 style={{fontSize:19,fontWeight:600,color:C.text,margin:"0 0 5px"}}>{cur.title}</h2>
          <p style={{fontSize:13,color:C.muted,lineHeight:1.7,margin:"0 0 18px"}}>{cur.sub}</p>
          {cur.fields.map(f=>(
            <div key={f.key} style={{marginBottom:13}}>
              <label style={{display:"block",fontSize:12,color:C.muted,marginBottom:5}}>{f.label}</label>
              {f.type==="text" ? (
                <input value={data[f.key]||""} onChange={e=>set(f.key,e.target.value)} placeholder={f.ph} style={{width:"100%",padding:"9px 12px",background:C.card2,border:`1px solid ${C.goldBorder}`,borderRadius:8,color:C.text,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
              ) : (
                <select value={data[f.key]||""} onChange={e=>set(f.key,e.target.value)} style={{width:"100%",padding:"9px 12px",background:C.card2,border:`1px solid ${C.goldBorder}`,borderRadius:8,color:data[f.key]?C.text:C.muted,fontSize:13,outline:"none",boxSizing:"border-box"}}>
                  <option value="">Select...</option>
                  {f.opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}
                </select>
              )}
            </div>
          ))}
          {step===0 && (
            <label style={{display:"flex",alignItems:"flex-start",gap:9,marginBottom:14,cursor:"pointer"}}>
              <input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)} style={{marginTop:2,accentColor:C.gold}}/>
              <span style={{fontSize:11,color:C.muted,lineHeight:1.6}}>I understand TALON is for educational purposes only and does not constitute financial, investment, legal, or tax advice. I agree to the Terms of Service and Privacy Policy.</span>
            </label>
          )}
          <button onClick={next} disabled={!canNext} style={{width:"100%",padding:"12px",background:canNext?C.gold:"rgba(201,162,39,0.1)",border:"none",borderRadius:9,color:canNext?"#000":C.muted,fontSize:14,fontWeight:700,cursor:canNext?"pointer":"not-allowed",transition:"all 0.2s"}}>
            {step>=OB.length-1?"Build My TALON Score":"Continue"}
          </button>
        </Card>
        <p style={{textAlign:"center",fontSize:10,color:C.dim}}>Step {step+1} of {OB.length} — Your data stays private and is never sold</p>
      </div>
    </div>
  );
}

function Dashboard({userData,scoreData,badges,plan,onNav,onUpgrade,streak}){
  const sc=scoreData.total;
  const scCol=sc>=70?C.green:sc>=45?C.gold:C.red;
  const roadmap=[];
  if(!userData.ef||userData.ef==="none"||userData.ef==="partial") roadmap.push({icon:"🚨",title:"Build Emergency Fund",desc:"No safety net means one crisis wipes everything. Start here.",mod:2,gain:"+15 pts",aff:"sofi"});
  if(userData.debt==="heavy"||userData.debt==="severe") roadmap.push({icon:"🔥",title:"Start the Debt Avalanche",desc:"List debts by interest rate. Attack highest rate first.",mod:3,gain:"+12 pts",aff:"lendingclub"});
  if(userData.retireSaving!=="yes") roadmap.push({icon:"⚡",title:"Open a Roth IRA Today",desc:"Every year of delay compounds against you.",mod:6,gain:"+14 pts",aff:"fidelity"});
  roadmap.push({icon:"📚",title:"Complete Module 1: Foundation",desc:"15 minutes. Your entire financial baseline established.",mod:1,gain:"+5 pts",aff:"ynab"});
  return(
    <div>
      <div style={{paddingBottom:12,borderBottom:`1px solid ${C.border}`,marginBottom:18}}>
        <div style={{fontSize:13,color:C.muted,marginBottom:3}}>Welcome back, <span style={{color:C.gold,fontWeight:600}}>{userData.name||"Investor"}</span></div>
        <h1 style={{fontSize:21,fontWeight:600,color:C.text,margin:"0 0 4px"}}>Your Financial Dashboard</h1>
        <div style={{fontSize:11,color:C.muted}}>🔥 {streak}-day streak</div>
      </div>
      {plan==="free" && (
        <div style={{background:"linear-gradient(135deg,rgba(201,162,39,0.1),rgba(201,162,39,0.04))",border:`1px solid ${C.goldBorder}`,borderRadius:12,padding:"12px 16px",marginBottom:18,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
          <div><div style={{fontSize:13,fontWeight:600,color:C.gold,marginBottom:2}}>Founding Member — 100 per tier</div><div style={{fontSize:11,color:C.muted}}>Lock in your rate forever. All features. All modules.</div></div>
          <button onClick={onUpgrade} style={{padding:"8px 16px",background:C.gold,border:"none",borderRadius:7,color:"#000",fontSize:12,fontWeight:700,cursor:"pointer"}}>Claim Spot</button>
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:18,alignItems:"start",marginBottom:20}}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
          <ScoreRing score={sc} size={140}/>
          <Pill label={sc>=70?"STRONG":sc>=45?"BUILDING":"NEEDS WORK"} color={scCol}/>
        </div>
        <div>
          <SL>SCORE BREAKDOWN</SL>
          {Object.entries(scoreData.breakdown).map(([k,v])=>(
            <div key={k} style={{marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}><span style={{color:C.muted}}>{k}</span><span style={{color:C.gold,fontFamily:"monospace",fontWeight:600}}>{v}/20</span></div>
              <div style={{height:4,background:"rgba(255,255,255,0.06)",borderRadius:2,overflow:"hidden"}}><div style={{height:4,width:`${(v/20)*100}%`,background:v>=15?C.green:v>=9?C.gold:C.red,borderRadius:2,transition:"width 1s ease"}}/></div>
            </div>
          ))}
        </div>
      </div>
      <ShareCard score={sc} userData={userData}/>
      <div style={{height:14}}/>
      <SL>YOUR PERSONALIZED ROADMAP</SL>
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:18}}>
        {roadmap.slice(0,3).map((item,i)=>(
          <Card key={i} style={{cursor:"pointer",borderColor:i===0?C.goldBorder:C.border}} onClick={()=>onNav("learn")}>
            <div style={{display:"flex",gap:11,alignItems:"flex-start"}}>
              <span style={{fontSize:18,flexShrink:0}}>{item.icon}</span>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:4,flexWrap:"wrap"}}>
                  <span style={{fontSize:13,fontWeight:600,color:C.text}}>{item.title}</span>
                  <Pill label={item.gain} color={C.green}/>
                </div>
                <p style={{fontSize:12,color:C.muted,lineHeight:1.6,margin:0}}>{item.desc}</p>
                <AffCard affKey={item.aff} context={"roadmap_"+i}/>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <div style={{padding:"14px 16px",background:"linear-gradient(135deg,rgba(167,139,250,0.1),rgba(167,139,250,0.03))",border:"1px solid rgba(167,139,250,0.25)",borderRadius:12,marginBottom:14}}>
        <div style={{fontSize:9,color:C.purple,letterSpacing:"0.1em",marginBottom:6}}>TALON INTELLIGENCE — EXCLUSIVE UPDATES</div>
        <p style={{fontSize:13,fontWeight:600,color:C.text,margin:"0 0 6px"}}>Be first to know everything.</p>
        <p style={{fontSize:12,color:C.muted,margin:"0 0 12px",lineHeight:1.7}}>New modules, market updates, and financial insights delivered before anyone else. The newsletter is the only place TALON announcements happen. Biweekly. Free forever. No noise.</p>
        <a href="https://talon-intelligence.beehiiv.com" target="_blank" rel="noopener noreferrer" style={{display:"block",textAlign:"center",padding:"10px",background:"linear-gradient(135deg,#a78bfa,#7c3aed)",borderRadius:8,color:"#fff",fontSize:13,fontWeight:700,textDecoration:"none",letterSpacing:"0.02em"}}>Get Exclusive Updates — Free</a>
        <p style={{fontSize:10,color:C.dim,textAlign:"center",margin:"6px 0 0"}}>Join TALON Intelligence. Unsubscribe anytime.</p>
      </div>
    </div>
  );
}

function Portfolio({plan,onEarnBadge,onUpgrade}){
  const [mode,setMode]=useState("portfolio");
  const [tier,setTier]=useState(5);
  const [portfolio,setPortfolio]=useState(null);
  const [loading,setLoading]=useState(false);
  const [loadMsg,setLoadMsg]=useState("");
  const [error,setError]=useState(null);
  const [hovered,setHovered]=useState(null);
  const t=TIER_CFG[tier];
  const locked=plan==="free"&&tier>5;

  const generate=useCallback(async()=>{
    if(locked){onUpgrade();return;}
    setLoading(true);setPortfolio(null);setError(null);
    setLoadMsg(LOAD_MSGS[Math.floor(Math.random()*LOAD_MSGS.length)]);
    const profiles={1:"ultra-conservative: Treasury ETFs (SHY,SGOV,BIL), TIPS",2:"income-focused: bond ETFs (LQD,VCIT), dividend aristocrats (NOBL), utilities (XLU)",3:"conservative growth: dividend growth (VIG,DGRO), staples (XLP), bonds (BND)",4:"moderate: S&P 500 (VOO), blue-chip dividends, bonds (BND). Classic 60/40",5:"balanced: diversified equities, 15-20% bonds, dividend layer",6:"balanced growth: growth large-caps (MSFT,AAPL,V), QQQ, minimal bonds, international (VEA)",7:"growth: QQQ, high-quality growth (NVDA,META,AMZN,GOOGL), no bonds",8:"aggressive growth: concentrated tech (NVDA,TSLA,AMD), small-cap (IWM), biotech (XBI)",9:"aggressive: high-volatility (TSLA,COIN,MSTR,PLTR), China tech (KWEB), emerging markets (EEM)",10:"maximum risk: 3x leveraged (TQQQ,SOXL), speculative (MSTR,COIN,RIOT,MARA)"};
    const prompt=`Educational portfolio basket for Risk Tier ${tier}/10: ${profiles[tier]}. Return ONLY raw JSON no markdown: {"stocks":[{"ticker":"VOO","name":"Vanguard S&P 500 ETF","allocation":40,"assetClass":"US Large Cap Blend","explanation":"2-3 sentences. Define financial terms inline in plain English.","whyThisTier":"One sentence."}],"strategyNote":"One sentence.","keyRisk":"One sentence.","expectedReturn":"e.g. 4-6% annually"}. Rules: 5-7 holdings, allocations sum to 100, real US tickers, tiers 1-3 must include bond ETFs, tiers 7-10 must be genuinely high-risk.`;
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-5",max_tokens:1000,messages:[{role:"user",content:prompt}]})});
      if(!res.ok) throw new Error("API "+res.status);
      const data=await res.json();
      const raw=data.content.filter(b=>b.type==="text").map(b=>b.text).join("").trim().replace(/^```json\s*/i,"").replace(/^```\s*/i,"").replace(/\s*```$/i,"").trim();
      const parsed=JSON.parse(raw);
      if(!parsed.stocks?.length) throw new Error("Invalid response");
      setPortfolio(parsed);
      onEarnBadge("portfolio_generated");
    }catch(e){setError(e.message);}
    setLoading(false);
  },[tier,locked,onEarnBadge,onUpgrade]);

  return(
    <div>
      <div style={{paddingBottom:12,borderBottom:`1px solid ${C.border}`,marginBottom:18}}>
        <div style={{display:"flex",gap:8,marginBottom:12}}>
          <button onClick={()=>setMode("portfolio")} style={{flex:1,padding:"9px",background:mode==="portfolio"?C.goldDim:"transparent",border:`1px solid ${mode==="portfolio"?C.goldBorder:C.border}`,borderRadius:8,color:mode==="portfolio"?C.gold:C.muted,fontSize:12,fontWeight:mode==="portfolio"?700:400,cursor:"pointer",outline:"none"}}>📈 Build Your Portfolio</button>
          <button onClick={()=>setMode("research")} style={{flex:1,padding:"9px",background:mode==="research"?C.goldDim:"transparent",border:`1px solid ${mode==="research"?C.goldBorder:C.border}`,borderRadius:8,color:mode==="research"?C.gold:C.muted,fontSize:12,fontWeight:mode==="research"?700:400,cursor:"pointer",outline:"none"}}>🔍 Research Any Asset</button>
        </div>
        {mode==="portfolio" && <h2 style={{fontSize:21,fontWeight:600,color:C.text,margin:"0 0 5px"}}>Portfolio Engine</h2>}
        {mode==="portfolio" && <p style={{fontSize:12,color:C.muted,margin:0}}>AI-generated baskets with plain-English explanations. Tiers 6-10 require Pro.</p>}
        {mode==="research" && <h2 style={{fontSize:21,fontWeight:600,color:C.text,margin:"0 0 5px"}}>Investment Research</h2>}
        {mode==="research" && <p style={{fontSize:12,color:C.muted,margin:0}}>Educational overviews across every asset class. Plain English. Free to start.</p>}
      </div>
      {mode==="research" && <Research onEarnBadge={onEarnBadge}/>}
      {mode==="portfolio" && <>
      <SL>SELECT RISK TIER</SL>
      <div style={{display:"grid",gridTemplateColumns:"repeat(10,1fr)",gap:4,marginBottom:6}}>
        {Array.from({length:10},(_,i)=>i+1).map(n=>{
          const col=TIER_CFG[n].col;
          const act=n===tier;
          const isLocked=plan==="free"&&n>5;
          return(
            <button key={n} onClick={()=>{setTier(n);setPortfolio(null);setError(null);}} style={{padding:"8px 0",fontSize:12,fontWeight:700,border:`1px solid ${act?col+"70":C.border}`,background:act?col+"18":C.card,color:act?col:isLocked?C.dim:C.muted,borderRadius:7,cursor:"pointer",fontFamily:"monospace",outline:"none",position:"relative"}}>
              {n}
            </button>
          );
        })}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:C.dim,letterSpacing:"0.07em",marginBottom:16}}>
        <span>SAFE</span><span>BALANCED</span><span>GROWTH</span><span>MAX RISK</span>
      </div>
      <Card style={{marginBottom:18,borderColor:t.col+"25"}}>
        <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
          <div style={{background:t.col+"18",border:`1px solid ${t.col}30`,borderRadius:9,padding:"6px 12px",textAlign:"center",flexShrink:0}}>
            <div style={{fontSize:24,fontWeight:800,color:t.col,fontFamily:"monospace",lineHeight:1}}>{tier}</div>
            <div style={{fontSize:8,color:t.col+"80",marginTop:1}}>/ 10</div>
          </div>
          <div style={{flex:1}}>
            <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:5}}><span style={{fontSize:14,fontWeight:600,color:C.text}}>{t.l}</span><Pill label={t.g} color={t.col}/></div>
            <p style={{fontSize:12,color:C.muted,lineHeight:1.6,margin:0}}>{t.desc}</p>
          </div>
        </div>
      </Card>
      {locked ? (
        <div style={{textAlign:"center",padding:"20px 0"}}>
          <div style={{fontSize:13,color:C.muted,marginBottom:10}}>Tiers 6-10 require TALON Pro</div>
          <button onClick={onUpgrade} style={{padding:"10px 22px",background:C.gold,border:"none",borderRadius:8,color:"#000",fontSize:13,fontWeight:700,cursor:"pointer"}}>Upgrade to Pro</button>
        </div>
      ) : (
        <>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
            <button onClick={generate} disabled={loading} style={{padding:"10px 20px",background:loading?"rgba(201,162,39,0.08)":t.col,border:`1px solid ${t.col}`,borderRadius:9,color:loading?C.gold:"#000",fontSize:13,fontWeight:700,cursor:loading?"not-allowed":"pointer",outline:"none",transition:"all 0.2s"}}>
              {loading?"Loading: "+loadMsg:"Generate Tier "+tier+" Portfolio"}
            </button>
            {error && <span style={{fontSize:11,color:C.red}}>{error}</span>}
          </div>
          {portfolio && (()=>{
            const stocks=portfolio.stocks||[];
            return(
              <div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7,marginBottom:16}}>
                  {[["EXPECTED RETURN",portfolio.expectedReturn],["HOLDINGS",stocks.length+" positions"],["RISK TIER",t.l]].map(([l,v])=>(
                    <div key={l} style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 11px"}}>
                      <div style={{fontSize:8,color:C.dim,letterSpacing:"0.1em",marginBottom:3}}>{l}</div>
                      <div style={{fontSize:12,fontWeight:600,color:C.text}}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:18}}>
                  <Card style={{borderLeft:`3px solid ${t.col}`,borderRadius:"0 10px 10px 0",padding:"11px 14px"}}><div style={{fontSize:8,color:t.col,letterSpacing:"0.1em",marginBottom:4}}>STRATEGY</div><p style={{fontSize:11,color:C.muted,lineHeight:1.8,margin:0}}>{portfolio.strategyNote}</p></Card>
                  <Card style={{borderLeft:"3px solid rgba(239,68,68,0.6)",borderRadius:"0 10px 10px 0",padding:"11px 14px"}}><div style={{fontSize:8,color:C.red,letterSpacing:"0.1em",marginBottom:4}}>KEY RISK</div><p style={{fontSize:11,color:C.muted,lineHeight:1.8,margin:0}}>{portfolio.keyRisk}</p></Card>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"155px 1fr",gap:20,alignItems:"start"}}>
                  <div>
                    <div style={{fontSize:9,color:C.muted,letterSpacing:"0.1em",marginBottom:10}}>ALLOCATION</div>
                    <div style={{position:"relative",width:145,height:145,margin:"0 auto 12px"}}>
                      <PieChart width={145} height={145}>
                        <Pie data={stocks} dataKey="allocation" cx={72} cy={72} innerRadius={44} outerRadius={66} paddingAngle={2} onMouseEnter={(_,i)=>setHovered(i)} onMouseLeave={()=>setHovered(null)}>
                          {stocks.map((s,i)=><Cell key={s.ticker} fill={PAL[i%PAL.length]} opacity={hovered===null||hovered===i?1:0.3}/>)}
                        </Pie>
                        <Tooltip formatter={v=>[v+"%"]} contentStyle={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:6,fontSize:11,color:C.text}}/>
                      </PieChart>
                      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
                        <div style={{fontSize:7,color:C.muted}}>TIER</div>
                        <div style={{fontSize:17,fontWeight:800,color:t.col,fontFamily:"monospace"}}>{tier}</div>
                      </div>
                    </div>
                    {stocks.map((s,i)=>(
                      <div key={s.ticker} style={{display:"flex",alignItems:"center",gap:5,marginBottom:3,opacity:hovered===null||hovered===i?1:0.3,transition:"opacity 0.15s"}} onMouseEnter={()=>setHovered(i)} onMouseLeave={()=>setHovered(null)}>
                        <div style={{width:6,height:6,borderRadius:2,background:PAL[i%PAL.length],flexShrink:0}}/>
                        <span style={{fontFamily:"monospace",fontSize:10,fontWeight:700,color:PAL[i%PAL.length],minWidth:40}}>{s.ticker}</span>
                        <span style={{fontSize:10,color:C.muted}}>{s.allocation}%</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div style={{fontSize:9,color:C.muted,letterSpacing:"0.1em",marginBottom:10}}>HOLDINGS</div>
                    {stocks.map((s,i)=>(
                      <div key={s.ticker} style={{paddingBottom:12,marginBottom:12,borderBottom:`1px solid ${C.border}`,opacity:hovered===null||hovered===i?1:0.4,transition:"opacity 0.15s"}} onMouseEnter={()=>setHovered(i)} onMouseLeave={()=>setHovered(null)}>
                        <div style={{display:"flex",gap:9,alignItems:"flex-start"}}>
                          <div style={{background:PAL[i%PAL.length]+"18",border:`1px solid ${PAL[i%PAL.length]}30`,borderRadius:5,padding:"3px 7px",minWidth:44,textAlign:"center",flexShrink:0}}>
                            <span style={{fontFamily:"monospace",fontSize:10,fontWeight:800,color:PAL[i%PAL.length]}}>{s.ticker}</span>
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{display:"flex",justifyContent:"space-between",gap:7,marginBottom:2}}>
                              <span style={{fontSize:12,fontWeight:600,color:C.text}}>{s.name}</span>
                              <span style={{fontFamily:"monospace",fontSize:12,fontWeight:800,color:PAL[i%PAL.length],flexShrink:0}}>{s.allocation}%</span>
                            </div>
                            <div style={{height:3,background:"rgba(255,255,255,0.06)",borderRadius:2,overflow:"hidden",marginBottom:5}}><div style={{height:3,width:`${s.allocation}%`,background:PAL[i%PAL.length],borderRadius:2}}/></div>
                            <div style={{fontSize:9,color:C.dim,marginBottom:4}}>{s.assetClass}</div>
                            <p style={{fontSize:11,color:C.muted,lineHeight:1.8,margin:"0 0 4px"}}>{s.explanation}</p>
                            {s.whyThisTier && <p style={{fontSize:10,color:t.col+"90",margin:0,fontStyle:"italic"}}>{s.whyThisTier}</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <AffCard affKey="robinhood" context="portfolio_complete"/>
                <div style={{marginTop:16,paddingTop:12,borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:7}}>
                  <p style={{fontSize:10,color:C.dim,margin:0,lineHeight:1.5}}>Educational only. Not investment advice. Consult a licensed financial advisor before investing.</p>
                  <button onClick={generate} style={{padding:"6px 12px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:7,color:C.muted,fontSize:11,cursor:"pointer",outline:"none"}}>Regenerate</button>
                </div>
              </div>
            );
          })()}
        </>
      )}
    </>}
    </div>
  );
}

function Learn({plan,onEarnBadge,completed,onComplete,onUpgrade}){
  const [active,setActive]=useState(null);
  const [quizState,setQuizState]=useState({});
  const [rating,setRating]=useState({});

  if(active){
    const mod=MODULES.find(m=>m.id===active.moduleId);
    const ch=mod?.chapters.find(c=>c.id===active.chapterId);
    if(!mod||!ch) return null;
    const isDone=completed[ch.id];
    const isLocked=!mod.free&&plan==="free";
    if(isLocked){
      return(
        <div>
          <button onClick={()=>setActive(null)} style={{background:"none",border:"none",color:C.gold,fontSize:13,cursor:"pointer",padding:"0 0 18px"}}>Back to modules</button>
          <div style={{textAlign:"center",padding:"40px 20px"}}>
            <div style={{fontSize:36,marginBottom:14}}>🔒</div>
            <h3 style={{fontSize:19,fontWeight:700,color:C.text,margin:"0 0 8px"}}>Pro Content</h3>
            <p style={{fontSize:13,color:C.muted,lineHeight:1.7,margin:"0 0 20px"}}>This module is part of TALON Pro. Unlock all 20 modules, AI coach, and your personal financial blueprint.</p>
            <button onClick={onUpgrade} style={{padding:"11px 24px",background:C.gold,border:"none",borderRadius:9,color:"#000",fontSize:13,fontWeight:700,cursor:"pointer"}}>See Founding Member Pricing</button>
          </div>
        </div>
      );
    }
    const quiz=ch.quiz||[];
    const qState=quizState[ch.id]||{};
    const allCorrect=quiz.length===0||quiz.every((_,i)=>qState[i]?.correct);
    const finish=()=>{
      onComplete(ch.id);
      onEarnBadge("chapter_completed");
      if(mod.id===1) onEarnBadge("module1_done");
      if(mod.id===6) onEarnBadge("module6_done");
      if(mod.id===14) onEarnBadge("module14_done");
      setActive(null);
    };
    return(
      <div>
        <button onClick={()=>setActive(null)} style={{background:"none",border:"none",color:C.gold,fontSize:13,cursor:"pointer",padding:"0 0 16px"}}>Back to modules</button>
        <div style={{fontSize:10,color:C.muted,marginBottom:3}}>{mod.icon} {mod.title}</div>
        <h2 style={{fontSize:19,fontWeight:600,color:C.text,margin:"0 0 16px"}}>{ch.title}</h2>
        <Card style={{borderLeft:`3px solid ${C.gold}`,borderRadius:"0 10px 10px 0",marginBottom:12,padding:"11px 15px"}}>
          <div style={{fontSize:8,color:C.gold,letterSpacing:"0.1em",marginBottom:5}}>HOOK</div>
          <p style={{fontSize:14,color:C.text,lineHeight:1.75,margin:0,fontStyle:"italic"}}>"{ch.hook}"</p>
        </Card>
        <Card style={{marginBottom:12}}><div style={{fontSize:8,color:C.muted,letterSpacing:"0.1em",marginBottom:5}}>THE CONCEPT</div><p style={{fontSize:13,color:C.muted,lineHeight:1.85,margin:0}}>{ch.concept}</p></Card>
        <Card style={{marginBottom:12,background:C.card2}}><div style={{fontSize:8,color:C.blue,letterSpacing:"0.1em",marginBottom:5}}>REAL NUMBERS</div><p style={{fontSize:13,color:C.muted,lineHeight:1.85,margin:0}}>{ch.realNumbers}</p></Card>
        <Card style={{marginBottom:12}}><div style={{fontSize:8,color:C.purple,letterSpacing:"0.1em",marginBottom:5}}>STREET-LEVEL ANALOGY</div><p style={{fontSize:13,color:C.muted,lineHeight:1.85,margin:0}}>{ch.analogy}</p></Card>
        <Card style={{marginBottom:12,background:"rgba(201,162,39,0.06)",borderColor:C.goldBorder}}><div style={{fontSize:8,color:C.gold,letterSpacing:"0.1em",marginBottom:5}}>AHA MOMENT</div><p style={{fontSize:13,color:C.text,lineHeight:1.85,margin:0,fontWeight:500}}>{ch.ahaMoment}</p></Card>
        <Card style={{marginBottom:14,background:"rgba(34,197,94,0.06)",borderColor:"rgba(34,197,94,0.25)"}}><div style={{fontSize:8,color:C.green,letterSpacing:"0.1em",marginBottom:5}}>YOUR ACTION STEP</div><p style={{fontSize:13,color:C.muted,lineHeight:1.85,margin:0}}>{ch.action}</p></Card>
        {quiz.length>0 && (
          <>
            <SL>KNOWLEDGE CHECK</SL>
            <div style={{display:"flex",flexDirection:"column",gap:14,marginBottom:16}}>
              {quiz.map((q,qi)=>{
                const qs=qState[qi]||{};
                return(
                  <Card key={qi}>
                    <p style={{fontSize:13,fontWeight:600,color:C.text,margin:"0 0 12px",lineHeight:1.6}}>{q.q}</p>
                    <div style={{display:"flex",flexDirection:"column",gap:5}}>
                      {q.opts.map((opt,oi)=>{
                        let bg="rgba(255,255,255,0.03)",border=C.border,col=C.muted;
                        if(qs.answered){
                          if(oi===q.ans){bg="rgba(34,197,94,0.12)";border="rgba(34,197,94,0.4)";col=C.green;}
                          else if(oi===qs.selected&&qs.selected!==q.ans){bg="rgba(239,68,68,0.12)";border="rgba(239,68,68,0.4)";col=C.red;}
                        }
                        return(
                          <button key={oi} onClick={()=>!qs.answered&&setQuizState(s=>({...s,[ch.id]:{...s[ch.id],[qi]:{selected:oi,answered:true,correct:oi===q.ans}}}))} style={{padding:"9px 12px",background:bg,border:`1px solid ${border}`,borderRadius:7,color:col,fontSize:12,textAlign:"left",cursor:qs.answered?"default":"pointer"}}>{opt}</button>
                        );
                      })}
                    </div>
                    {qs.answered && (
                      <div style={{marginTop:8,padding:"8px 10px",background:qs.correct?"rgba(34,197,94,0.08)":"rgba(239,68,68,0.08)",border:`1px solid ${qs.correct?"rgba(34,197,94,0.25)":"rgba(239,68,68,0.25)"}`,borderRadius:7}}>
                        <div style={{fontSize:11,fontWeight:600,color:qs.correct?C.green:C.red,marginBottom:3}}>{qs.correct?"Exactly right.":"Not quite — but now you know."}</div>
                        <div style={{fontSize:11,color:C.muted,lineHeight:1.6}}>{q.exp}</div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </>
        )}
        <div style={{marginBottom:12}}>
          <div style={{fontSize:9,color:C.muted,letterSpacing:"0.1em",marginBottom:8}}>RATE THIS CHAPTER</div>
          <div style={{display:"flex",gap:6,marginBottom:4}}>
            {[1,2,3,4,5].map(s=>(
              <button key={s} onClick={()=>setRating(r=>({...r,[ch.id]:s}))} style={{fontSize:20,background:"none",border:"none",cursor:"pointer",opacity:rating[ch.id]>=s?1:0.3,transition:"opacity 0.15s"}}>⭐</button>
            ))}
          </div>
          {rating[ch.id] && <div style={{fontSize:11,color:C.muted}}>{rating[ch.id]>=4?"Thanks — glad this landed.":rating[ch.id]>=2?"Noted. We will sharpen this.":"Fair. We will fix it."}</div>}
        </div>
        {MOD_AFF[mod.id] && <AffCard affKey={MOD_AFF[mod.id]} context={"module_"+mod.id}/>}
        <div style={{height:14}}/>
        <button onClick={finish} disabled={!allCorrect&&!isDone} style={{width:"100%",padding:"12px",background:isDone?"rgba(34,197,94,0.12)":!allCorrect?"rgba(201,162,39,0.15)":C.gold,border:isDone?`1px solid ${C.green}`:!allCorrect?`1px solid ${C.goldBorder}`:"none",borderRadius:9,color:isDone?C.green:!allCorrect?C.gold:"#000",fontSize:13,fontWeight:700,cursor:isDone||allCorrect?"pointer":"not-allowed",outline:"none"}}>
          {isDone?"Chapter Complete":!allCorrect?"Answer all questions to continue":"Mark Complete"}
        </button>
        <p style={{fontSize:10,color:C.dim,textAlign:"center",marginTop:6}}>TALON is for educational purposes only. Not financial advice.</p>
      </div>
    );
  }

  const totalCh=MODULES.reduce((s,m)=>s+m.chapters.length,0);
  const doneCount=Object.keys(completed).length;
  return(
    <div>
      <div style={{paddingBottom:12,borderBottom:`1px solid ${C.border}`,marginBottom:18}}>
        <h2 style={{fontSize:21,fontWeight:600,color:C.text,margin:"0 0 5px"}}>Financial Fluency Library</h2>
        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <p style={{fontSize:12,color:C.muted,margin:0}}>20 modules — {totalCh} chapters — 3 min each</p>
          <Pill label={doneCount+"/"+totalCh+" complete"} color={C.green}/>
          {plan==="free" && <Pill label="Modules 1-5 Free" color={C.gold}/>}
        </div>
      </div>
      <div style={{height:4,background:"rgba(255,255,255,0.06)",borderRadius:2,overflow:"hidden",marginBottom:18}}>
        <div style={{height:4,width:`${(doneCount/totalCh)*100}%`,background:C.gold,borderRadius:2,transition:"width 0.5s ease"}}/>
      </div>
      {plan==="free" && (
        <div style={{padding:"10px 14px",background:"rgba(201,162,39,0.06)",border:`1px solid ${C.goldBorder}`,borderRadius:9,marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:7}}>
          <div style={{fontSize:12,color:C.muted}}>Modules 6-20 unlock with Pro. First 100 founding spots per tier.</div>
          <button onClick={onUpgrade} style={{padding:"6px 12px",background:C.gold,border:"none",borderRadius:6,color:"#000",fontSize:11,fontWeight:700,cursor:"pointer"}}>Claim Spot</button>
        </div>
      )}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {MODULES.map(mod=>{
          const chapDone=mod.chapters.filter(c=>completed[c.id]).length;
          const allDone=chapDone===mod.chapters.length;
          const isLocked=!mod.free&&plan==="free";
          return(
            <Card key={mod.id} style={{cursor:"pointer",borderColor:allDone?"rgba(34,197,94,0.25)":isLocked?"rgba(255,255,255,0.03)":C.border,opacity:isLocked?0.65:1}} onClick={()=>mod.chapters[0]&&setActive({moduleId:mod.id,chapterId:mod.chapters[0].id})}>
              <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                <span style={{fontSize:18,flexShrink:0}}>{isLocked?"🔒":mod.icon}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3,flexWrap:"wrap"}}>
                    <span style={{fontSize:13,fontWeight:600,color:C.text}}>Module {mod.id}: {mod.title}</span>
                    {allDone && <Pill label="Complete" color={C.green}/>}
                    {!allDone&&chapDone>0 && <Pill label={chapDone+"/"+mod.chapters.length} color={C.gold}/>}
                    {mod.free && <Pill label="Free" color={C.green}/>}
                  </div>
                  <p style={{fontSize:11,color:C.muted,lineHeight:1.6,margin:"0 0 6px"}}>{mod.subtitle}</p>
                  {!isLocked && (
                    <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                      {mod.chapters.map(ch=>(
                        <button key={ch.id} onClick={e=>{e.stopPropagation();setActive({moduleId:mod.id,chapterId:ch.id});}} style={{fontSize:10,padding:"2px 8px",borderRadius:4,background:completed[ch.id]?"rgba(34,197,94,0.12)":C.goldDim,border:`1px solid ${completed[ch.id]?"rgba(34,197,94,0.3)":C.goldBorder}`,color:completed[ch.id]?C.green:C.gold,cursor:"pointer"}}>
                          {completed[ch.id]?"Done: ":""}{ch.title.split(":")[0]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <span style={{fontSize:10,color:C.muted,flexShrink:0}}>{mod.chapters.length}ch</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Calculators({onEarnBadge,hasUsed,setHasUsed}){
  const [calc,setCalc]=useState("compound");
  const [ci,setCi]=useState({principal:10000,rate:8,years:30,monthly:200});
  const [dp,setDp]=useState({balance:15000,apr:22,payment:300});
  const [rt,setRt]=useState({age:30,retireAge:65,saved:5000,monthly:400,rate:7});
  useEffect(()=>{if(!hasUsed){setHasUsed(true);onEarnBadge("calculator_used");}},[]);

  const ciData=Array.from({length:ci.years+1},(_,y)=>({year:y,principal:Math.round(ci.principal+ci.monthly*12*y),total:Math.round(ci.principal*Math.pow(1+ci.rate/100,y)+ci.monthly*12*(Math.pow(1+ci.rate/100,y)-1)/(ci.rate/100))}));
  const ciFinal=ciData[ciData.length-1]?.total||0;
  const ciContrib=ci.principal+ci.monthly*12*ci.years;
  const dpCalc=(()=>{const rows=[];let bal=dp.balance,m=0;while(bal>0&&m<=359){const int=bal*(dp.apr/100/12);bal=Math.max(0,bal+int-dp.payment);m++;if(m%3===0)rows.push({month:m,balance:Math.round(bal)});}return{rows,months:m,totalInterest:Math.max(0,Math.round(m*dp.payment-dp.balance))};})();
  const rtData=(()=>{const yrs=Math.max(0,rt.retireAge-rt.age);const rows=[];let bal=rt.saved;for(let y=0;y<=yrs;y++){rows.push({year:rt.age+y,balance:Math.round(bal)});bal=(bal+rt.monthly*12)*(1+rt.rate/100);}return{rows,final:Math.round(bal)};})();

  const Sl=({label,val,min,max,step=1,fmt,onChange})=>(
    <div style={{marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}><span style={{color:C.muted}}>{label}</span><span style={{color:C.gold,fontFamily:"monospace",fontWeight:600}}>{fmt(val)}</span></div>
      <input type="range" min={min} max={max} step={step} value={val} onChange={e=>onChange(Number(e.target.value))} style={{width:"100%",accentColor:C.gold}}/>
    </div>
  );
  const usd=v=>"$"+v.toLocaleString();
  const pct=v=>v+"%";

  return(
    <div>
      <div style={{paddingBottom:12,borderBottom:`1px solid ${C.border}`,marginBottom:18}}>
        <h2 style={{fontSize:21,fontWeight:600,color:C.text,margin:"0 0 5px"}}>Personal Stakes Calculators</h2>
        <p style={{fontSize:12,color:C.muted,margin:0}}>Your numbers. Your timeline. Your actual financial future.</p>
      </div>
      <div style={{display:"flex",gap:5,marginBottom:18,flexWrap:"wrap"}}>
        {[["compound","Compound Interest"],["debt","Debt Payoff"],["retire","Retirement"]].map(([id,label])=>(
          <button key={id} onClick={()=>setCalc(id)} style={{padding:"7px 14px",background:calc===id?C.goldDim:"transparent",border:`1px solid ${calc===id?C.goldBorder:C.border}`,borderRadius:7,color:calc===id?C.gold:C.muted,fontSize:11,fontWeight:calc===id?600:400,cursor:"pointer",outline:"none"}}>{label}</button>
        ))}
      </div>
      {calc==="compound" && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <Card>
            <div style={{fontSize:9,color:C.muted,letterSpacing:"0.1em",marginBottom:13}}>INPUTS</div>
            <Sl label="Starting amount" val={ci.principal} min={1000} max={100000} step={500} fmt={usd} onChange={v=>setCi(p=>({...p,principal:v}))}/>
            <Sl label="Monthly contribution" val={ci.monthly} min={0} max={2000} step={50} fmt={usd} onChange={v=>setCi(p=>({...p,monthly:v}))}/>
            <Sl label="Annual return" val={ci.rate} min={2} max={15} step={0.5} fmt={pct} onChange={v=>setCi(p=>({...p,rate:v}))}/>
            <Sl label="Years" val={ci.years} min={5} max={50} fmt={v=>v+" yrs"} onChange={v=>setCi(p=>({...p,years:v}))}/>
            <div style={{marginTop:13,padding:"9px 12px",background:C.card2,borderRadius:7,marginBottom:7}}><div style={{fontSize:8,color:C.muted,marginBottom:2}}>CONTRIBUTIONS</div><div style={{fontSize:14,fontWeight:700,color:C.text}}>{usd(ciContrib)}</div></div>
            <div style={{padding:"11px 13px",background:C.goldDim,border:`1px solid ${C.goldBorder}`,borderRadius:8}}><div style={{fontSize:8,color:C.gold,marginBottom:2}}>FINAL BALANCE</div><div style={{fontSize:21,fontWeight:800,color:C.gold}}>{usd(ciFinal)}</div><div style={{fontSize:10,color:C.muted,marginTop:2}}>Growth: {usd(Math.max(0,ciFinal-ciContrib))}</div></div>
            <AffCard affKey="betterment" context="compound_calc"/>
          </Card>
          <Card>
            <div style={{fontSize:9,color:C.muted,letterSpacing:"0.1em",marginBottom:10}}>GROWTH OVER TIME</div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={ciData} margin={{top:5,right:5,left:0,bottom:5}}>
                <XAxis dataKey="year" tick={{fill:C.dim,fontSize:9}} tickLine={false} axisLine={false}/>
                <YAxis tick={{fill:C.dim,fontSize:9}} tickLine={false} axisLine={false} tickFormatter={v=>v>=1000000?`${(v/1000000).toFixed(1)}M`:v>=1000?`${(v/1000).toFixed(0)}k`:String(v)}/>
                <Tooltip formatter={v=>[usd(v)]} contentStyle={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:6,fontSize:10,color:C.text}}/>
                <Area type="monotone" dataKey="principal" stroke="rgba(255,255,255,0.08)" fill="rgba(255,255,255,0.03)" name="Contributions"/>
                <Area type="monotone" dataKey="total" stroke={C.gold} fill={C.gold+"20"} name="Total Balance"/>
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}
      {calc==="debt" && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <Card>
            <div style={{fontSize:9,color:C.muted,letterSpacing:"0.1em",marginBottom:13}}>INPUTS</div>
            <Sl label="Current balance" val={dp.balance} min={500} max={50000} step={500} fmt={usd} onChange={v=>setDp(p=>({...p,balance:v}))}/>
            <Sl label="APR" val={dp.apr} min={5} max={36} step={0.5} fmt={pct} onChange={v=>setDp(p=>({...p,apr:v}))}/>
            <Sl label="Monthly payment" val={dp.payment} min={50} max={2000} step={25} fmt={usd} onChange={v=>setDp(p=>({...p,payment:v}))}/>
            <div style={{marginTop:13,display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
              {[["MONTHS",dpCalc.months>=360?"Pay more":dpCalc.months+" mo"],["TOTAL INTEREST",usd(dpCalc.totalInterest)]].map(([l,v])=>(
                <div key={l} style={{padding:"9px 11px",background:C.card2,borderRadius:7}}><div style={{fontSize:8,color:C.dim,marginBottom:2}}>{l}</div><div style={{fontSize:12,fontWeight:700,color:l==="TOTAL INTEREST"?C.red:C.text}}>{v}</div></div>
              ))}
            </div>
            <AffCard affKey="lendingclub" context="debt_calc"/>
          </Card>
          <Card>
            <div style={{fontSize:9,color:C.muted,letterSpacing:"0.1em",marginBottom:10}}>BALANCE OVER TIME</div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={dpCalc.rows} margin={{top:5,right:5,left:0,bottom:5}}>
                <XAxis dataKey="month" tick={{fill:C.dim,fontSize:9}} tickLine={false} axisLine={false}/>
                <YAxis tick={{fill:C.dim,fontSize:9}} tickLine={false} axisLine={false} tickFormatter={v=>"$"+(v/1000).toFixed(0)+"k"}/>
                <Tooltip formatter={v=>[usd(v),"Balance"]} contentStyle={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:6,fontSize:10,color:C.text}}/>
                <Line type="monotone" dataKey="balance" stroke={C.red} strokeWidth={2} dot={false}/>
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}
      {calc==="retire" && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <Card>
            <div style={{fontSize:9,color:C.muted,letterSpacing:"0.1em",marginBottom:13}}>INPUTS</div>
            <Sl label="Current age" val={rt.age} min={18} max={60} fmt={v=>v+" yrs old"} onChange={v=>setRt(p=>({...p,age:v}))}/>
            <Sl label="Retirement age" val={rt.retireAge} min={50} max={75} fmt={v=>v+" yrs old"} onChange={v=>setRt(p=>({...p,retireAge:v}))}/>
            <Sl label="Current savings" val={rt.saved} min={0} max={200000} step={1000} fmt={usd} onChange={v=>setRt(p=>({...p,saved:v}))}/>
            <Sl label="Monthly contribution" val={rt.monthly} min={50} max={3000} step={50} fmt={usd} onChange={v=>setRt(p=>({...p,monthly:v}))}/>
            <Sl label="Expected annual return" val={rt.rate} min={3} max={12} step={0.5} fmt={pct} onChange={v=>setRt(p=>({...p,rate:v}))}/>
            <div style={{marginTop:13,padding:"12px",background:C.goldDim,border:`1px solid ${C.goldBorder}`,borderRadius:8}}><div style={{fontSize:8,color:C.gold,marginBottom:2}}>PROJECTED AT AGE {rt.retireAge}</div><div style={{fontSize:22,fontWeight:800,color:C.gold}}>{usd(rtData.final)}</div><div style={{fontSize:10,color:C.muted,marginTop:2}}>{rt.retireAge-rt.age} years at {rt.rate}%</div></div>
            <AffCard affKey="fidelity" context="retirement_calc"/>
          </Card>
          <Card>
            <div style={{fontSize:9,color:C.muted,letterSpacing:"0.1em",marginBottom:10}}>PROJECTED GROWTH</div>
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={rtData.rows} margin={{top:5,right:5,left:0,bottom:5}}>
                <XAxis dataKey="year" tick={{fill:C.dim,fontSize:9}} tickLine={false} axisLine={false}/>
                <YAxis tick={{fill:C.dim,fontSize:9}} tickLine={false} axisLine={false} tickFormatter={v=>v>=1000000?"$"+(v/1000000).toFixed(1)+"M":v>=1000?"$"+(v/1000).toFixed(0)+"k":"$0"}/>
                <Tooltip formatter={v=>[usd(v),"Balance"]} contentStyle={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:6,fontSize:10,color:C.text}}/>
                <Area type="monotone" dataKey="balance" stroke={C.green} fill={C.green+"18"} strokeWidth={2} dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}
    </div>
  );
}


function Research({onEarnBadge}){
  const CLASSES=[
    {id:"stock",label:"Stock",icon:"📈",hint:"e.g. AAPL, NVDA, TSLA"},
    {id:"etf",label:"ETF",icon:"⚖️",hint:"e.g. VOO, QQQ, ARKK"},
    {id:"crypto",label:"Crypto",icon:"₿",hint:"e.g. Bitcoin, Ethereum, Solana"},
    {id:"commodity",label:"Commodity",icon:"🥇",hint:"e.g. Gold, Silver, Oil, Natural Gas"},
    {id:"currency",label:"Currency",icon:"💱",hint:"e.g. EUR/USD, GBP/USD, USD/JPY"},
    {id:"bond",label:"Bond",icon:"📄",hint:"e.g. US Treasury, Corporate Bonds, Municipals"},
    {id:"reit",label:"REIT",icon:"🏢",hint:"e.g. VNQ, O, SPG, AMT"},
    {id:"international",label:"International",icon:"🌍",hint:"e.g. VEA, EEM, Nikkei, FTSE"},
  ];
  const AFF_BY_CLASS={stock:"robinhood",etf:"fidelity",crypto:"coinbase",commodity:"smartasset",currency:"smartasset",bond:"fidelity",reit:"fundrise",international:"betterment"};
  const [assetClass,setAssetClass]=useState("stock");
  const [query,setQuery]=useState("");
  const [result,setResult]=useState(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState(null);
  const [showAff,setShowAff]=useState(false);
  const cur=CLASSES.find(c=>c.id===assetClass);

  const research=async()=>{
    if(!query.trim()) return;
    setLoading(true);setResult(null);setError(null);setShowAff(false);
    const prompt="Educational investment research for a financial literacy platform. Asset class: "+assetClass+". Asset: "+query+".\n\nReturn ONLY raw JSON no markdown:\n{\"name\":\"Full name\",\"ticker\":\"TICKER or N/A\",\"oneLiner\":\"One sentence plain English description\",\"whatItIs\":\"2-3 sentences what this asset is in plain English. Define every term inline.\",\"whatDrivesPrice\":\"2-3 sentences on what makes the price move. Plain English.\",\"keyRisk\":\"Biggest risk in one sentence.\",\"historicalContext\":\"One notable historical fact.\",\"talonRiskRating\":7,\"whoShouldConsider\":\"One sentence on what investor this suits.\",\"whoShouldAvoid\":\"One sentence on who should not consider this.\",\"relatedAssets\":[\"Asset1\",\"Asset2\",\"Asset3\"]}\n\ntalonRiskRating must be 1-10. Crypto=9-10. Treasuries=1-2. Blue chip stocks=5-6.";
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-5",max_tokens:800,messages:[{role:"user",content:prompt}]})});
      if(!res.ok) throw new Error("API "+res.status);
      const data=await res.json();
      const raw=data.content.filter(b=>b.type==="text").map(b=>b.text).join("").trim().replace(/^```json\s*/i,"").replace(/^```\s*/i,"").replace(/\s*```$/i,"").trim();
      setResult(JSON.parse(raw));
      setTimeout(()=>setShowAff(true),6000);
    }catch(e){setError("Research failed — "+e.message);}
    setLoading(false);
  };

  const riskCol=(r)=>r>=8?C.red:r>=6?"#f97316":r>=4?C.gold:C.green;

  return(
    <div>
      <div style={{paddingBottom:12,borderBottom:`1px solid ${C.border}`,marginBottom:18}}>
        <h2 style={{fontSize:21,fontWeight:600,color:C.text,margin:"0 0 5px"}}>Investment Research</h2>
        <p style={{fontSize:12,color:C.muted,margin:0}}>Educational overviews across every asset class. Plain English. Free — to start.</p>
      </div>
      <div style={{fontSize:10,color:C.muted,letterSpacing:"0.1em",marginBottom:10}}>SELECT ASSET CLASS</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:18}}>
        {CLASSES.map(c=>(
          <button key={c.id} onClick={()=>{setAssetClass(c.id);setResult(null);setQuery("");setError(null);setShowAff(false);}} style={{padding:"9px 6px",background:assetClass===c.id?C.goldDim:"rgba(255,255,255,0.02)",border:`1px solid ${assetClass===c.id?C.goldBorder:C.border}`,borderRadius:8,color:assetClass===c.id?C.gold:C.muted,fontSize:11,fontWeight:assetClass===c.id?600:400,cursor:"pointer",textAlign:"center",outline:"none"}}>
            <div style={{fontSize:16,marginBottom:3}}>{c.icon}</div>{c.label}
          </button>
        ))}
      </div>
      <div style={{display:"flex",gap:8,marginBottom:18}}>
        <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&research()} placeholder={cur.hint} style={{flex:1,padding:"10px 14px",background:C.card2,border:`1px solid ${C.goldBorder}`,borderRadius:8,color:C.text,fontSize:13,outline:"none"}}/>
        <button onClick={research} disabled={!query.trim()||loading} style={{padding:"10px 20px",background:query.trim()?C.gold:"rgba(201,162,39,0.15)",border:"none",borderRadius:8,color:query.trim()?"#000":C.muted,fontSize:13,fontWeight:700,cursor:query.trim()?"pointer":"not-allowed",whiteSpace:"nowrap",outline:"none"}}>
          {loading?"Researching...":"Research"}
        </button>
      </div>
      {error&&<div style={{padding:"10px 14px",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.25)",borderRadius:8,fontSize:12,color:C.red,marginBottom:14}}>{error}</div>}
      {result&&(
        <div>
          <div style={{display:"flex",alignItems:"flex-start",gap:14,marginBottom:16,padding:"14px 16px",background:C.card2,borderRadius:12,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:28,flexShrink:0}}>{cur.icon}</div>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4,flexWrap:"wrap"}}>
                <span style={{fontSize:17,fontWeight:700,color:C.text}}>{result.name}</span>
                {result.ticker&&result.ticker!=="N/A"&&<span style={{fontFamily:"monospace",fontSize:12,fontWeight:800,color:C.gold,padding:"2px 8px",background:C.goldDim,borderRadius:5}}>{result.ticker}</span>}
                <span style={{fontSize:10,fontWeight:700,color:riskCol(result.talonRiskRating),padding:"2px 8px",background:riskCol(result.talonRiskRating)+"18",borderRadius:5}}>RISK {result.talonRiskRating}/10</span>
              </div>
              <p style={{fontSize:13,color:C.muted,margin:0,fontStyle:"italic"}}>{result.oneLiner}</p>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
            <Card><div style={{fontSize:8,color:C.blue,letterSpacing:"0.1em",marginBottom:5}}>WHAT IT IS</div><p style={{fontSize:13,color:C.muted,lineHeight:1.8,margin:0}}>{result.whatItIs}</p></Card>
            <Card><div style={{fontSize:8,color:C.purple,letterSpacing:"0.1em",marginBottom:5}}>WHAT DRIVES THE PRICE</div><p style={{fontSize:13,color:C.muted,lineHeight:1.8,margin:0}}>{result.whatDrivesPrice}</p></Card>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Card style={{borderLeft:`3px solid ${C.red}`,borderRadius:"0 10px 10px 0",padding:"12px 14px"}}><div style={{fontSize:8,color:C.red,letterSpacing:"0.1em",marginBottom:4}}>KEY RISK</div><p style={{fontSize:12,color:C.muted,lineHeight:1.7,margin:0}}>{result.keyRisk}</p></Card>
              <Card style={{borderLeft:`3px solid ${C.gold}`,borderRadius:"0 10px 10px 0",padding:"12px 14px"}}><div style={{fontSize:8,color:C.gold,letterSpacing:"0.1em",marginBottom:4}}>HISTORICAL CONTEXT</div><p style={{fontSize:12,color:C.muted,lineHeight:1.7,margin:0}}>{result.historicalContext}</p></Card>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Card style={{background:"rgba(34,197,94,0.05)",borderColor:"rgba(34,197,94,0.2)"}}><div style={{fontSize:8,color:C.green,letterSpacing:"0.1em",marginBottom:4}}>WHO SHOULD CONSIDER</div><p style={{fontSize:12,color:C.muted,lineHeight:1.7,margin:0}}>{result.whoShouldConsider}</p></Card>
              <Card style={{background:"rgba(239,68,68,0.05)",borderColor:"rgba(239,68,68,0.2)"}}><div style={{fontSize:8,color:C.red,letterSpacing:"0.1em",marginBottom:4}}>WHO SHOULD AVOID</div><p style={{fontSize:12,color:C.muted,lineHeight:1.7,margin:0}}>{result.whoShouldAvoid}</p></Card>
            </div>
            {result.relatedAssets&&result.relatedAssets.length>0&&(
              <Card><div style={{fontSize:8,color:C.muted,letterSpacing:"0.1em",marginBottom:8}}>EXPLORE RELATED</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {result.relatedAssets.map(a=><button key={a} onClick={()=>{setQuery(a);setResult(null);setShowAff(false);}} style={{padding:"4px 12px",background:C.goldDim,border:`1px solid ${C.goldBorder}`,borderRadius:6,color:C.gold,fontSize:11,cursor:"pointer"}}>{a}</button>)}
                </div>
              </Card>
            )}
          </div>
          <div style={{padding:"14px 16px",background:"rgba(255,255,255,0.02)",border:`1px solid ${C.border}`,borderRadius:10,marginBottom:14}}>
            <p style={{fontSize:12,color:C.muted,margin:"0 0 10px",lineHeight:1.7}}>TALON gives you the foundation. To go deeper — live charts, analyst ratings, earnings history, and real-time financials — you need a brokerage account. Free to open. 10 minutes.</p>
            {showAff?(
              <AffCard affKey={AFF_BY_CLASS[assetClass]} context={"research_"+assetClass}/>
            ):(
              <button onClick={()=>setShowAff(true)} style={{width:"100%",padding:"10px",background:C.gold,border:"none",borderRadius:8,color:"#000",fontSize:13,fontWeight:700,cursor:"pointer"}}>Continue Your Research — Open a Free Account</button>
            )}
          </div>
          <p style={{fontSize:10,color:C.dim,textAlign:"center",lineHeight:1.5}}>Educational only. Not investment advice. Past performance does not guarantee future results.</p>
        </div>
      )}
    </div>
  );
}

function ScoreDetail({scoreData,userData,onUpgrade}){
  const pillars=[
    {key:"Emergency Fund",icon:"🛡️",tips:["Open a high-yield savings account","Automate monthly transfers","Goal: 3-6 months expenses"],aff:"sofi"},
    {key:"Debt Health",icon:"💳",tips:["List debts by interest rate","Attack highest APR first","Every extra dollar matters"],aff:"lendingclub"},
    {key:"Retirement",icon:"🌱",tips:["Open a Roth IRA if eligible","Get full 401k employer match","Increase rate 1% per year"],aff:"fidelity"},
    {key:"Income",icon:"💼",tips:["Track all income sources","Build secondary income stream","Negotiate — worst answer is no"],aff:"smartasset"},
    {key:"Knowledge",icon:"🧠",tips:["Complete TALON modules","Apply one concept per week","Teach what you learn"],aff:"ynab"},
  ];
  const col=scoreData.total>=70?C.green:scoreData.total>=45?C.gold:C.red;
  return(
    <div>
      <div style={{paddingBottom:12,borderBottom:`1px solid ${C.border}`,marginBottom:18}}>
        <h2 style={{fontSize:21,fontWeight:600,color:C.text,margin:"0 0 5px"}}>Your TALON Score</h2>
        <p style={{fontSize:12,color:C.muted,margin:0}}>Five dimensions of financial health. One number to improve.</p>
      </div>
      <div style={{display:"flex",justifyContent:"center",marginBottom:20}}><ScoreRing score={scoreData.total} size={172} stroke={15}/></div>
      <div style={{textAlign:"center",marginBottom:20}}>
        <div style={{fontSize:14,color:col,fontWeight:600,marginBottom:5}}>{scoreData.total>=70?"Strong Financial Foundation":scoreData.total>=45?"Building Momentum":"Financial Work Ahead — And That Is Okay"}</div>
        <p style={{fontSize:12,color:C.muted,maxWidth:420,margin:"0 auto",lineHeight:1.7}}>{scoreData.total>=70?"You are in a strong position. Focus on optimizing returns and building generational wealth.":scoreData.total>=45?"Fundamentals in place. Biggest gains come from closing the gaps below.":"Every journey starts at zero. You have a clear map of exactly what to improve."}</p>
      </div>
      <ShareCard score={scoreData.total} userData={userData}/>
      <div style={{height:14}}/>
      <SL>BREAKDOWN AND HOW TO IMPROVE</SL>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {pillars.map(p=>{
          const v=scoreData.breakdown[p.key]||0;
          const pct=(v/20)*100;
          return(
            <Card key={p.key}>
              <div style={{display:"flex",alignItems:"flex-start",gap:11}}>
                <span style={{fontSize:18,flexShrink:0}}>{p.icon}</span>
                <div style={{flex:1}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:13,fontWeight:600,color:C.text}}>{p.key}</span><span style={{fontSize:13,fontWeight:700,fontFamily:"monospace",color:pct>=75?C.green:pct>=45?C.gold:C.red}}>{v}/20</span></div>
                  <div style={{height:5,background:"rgba(255,255,255,0.06)",borderRadius:3,overflow:"hidden",marginBottom:8}}><div style={{height:5,width:`${pct}%`,background:pct>=75?C.green:pct>=45?C.gold:C.red,borderRadius:3,transition:"width 1s ease"}}/></div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5}}>{p.tips.map(tip=><span key={tip} style={{fontSize:10,padding:"2px 7px",background:"rgba(255,255,255,0.04)",border:`1px solid ${C.border}`,borderRadius:4,color:C.muted}}>{tip}</span>)}</div>
                  {pct<=59 && <AffCard affKey={p.aff} context={"score_"+p.key.replace(/ /g,"_")}/>}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function LegalFooter(){
  const [show,setShow]=useState(null);
  return(
    <div style={{padding:"12px 20px",borderTop:`1px solid ${C.border}`,textAlign:"center"}}>
      <p style={{fontSize:9,color:C.dim,margin:"0 0 5px",lineHeight:1.6}}>TALON Financial Fluency Engine — Powered by Logantia AI — Educational purposes only — Not financial, investment, legal, or tax advice</p>
      <div style={{display:"flex",justifyContent:"center",gap:14,flexWrap:"wrap"}}>
        {[["terms","Terms"],["privacy","Privacy"],["disclaimer","Disclaimer"]].map(([k,l])=>(
          <button key={k} onClick={()=>setShow(show===k?null:k)} style={{background:"none",border:"none",color:C.dim,fontSize:9,cursor:"pointer",textDecoration:"underline"}}>{l}</button>
        ))}
      </div>
      {show==="terms" && <div style={{marginTop:10,padding:"12px",background:C.card,border:`1px solid ${C.border}`,borderRadius:8,textAlign:"left",fontSize:10,color:C.muted,lineHeight:1.7}}><strong style={{color:C.text}}>Terms of Service — Logantia AI / TALON</strong><br/><br/>By using TALON you agree: (1) TALON provides educational content only — not financial, investment, legal, or tax advice; (2) you will consult a licensed professional before making financial decisions; (3) Logantia AI is not liable for financial decisions made based on TALON content; (4) affiliate links may generate commissions at no cost to you; (5) you are at least 18 years of age.</div>}
      {show==="privacy" && <div style={{marginTop:10,padding:"12px",background:C.card,border:`1px solid ${C.border}`,borderRadius:8,textAlign:"left",fontSize:10,color:C.muted,lineHeight:1.7}}><strong style={{color:C.text}}>Privacy Policy — Logantia AI / TALON</strong><br/><br/>TALON collects only information you voluntarily provide: age range, income range, debt level, savings status, financial knowledge, and optional email. This data personalizes your TALON Score. We do not sell your personal data. You may request data deletion at any time.</div>}
      {show==="disclaimer" && <div style={{marginTop:10,padding:"12px",background:C.card,border:`1px solid ${C.border}`,borderRadius:8,textAlign:"left",fontSize:10,color:C.muted,lineHeight:1.7}}><strong style={{color:C.text}}>Financial Disclaimer — Logantia AI / TALON</strong><br/><br/>All TALON content is for educational and informational purposes only. Nothing constitutes financial advice, investment advice, tax advice, or legal advice. The TALON Score is an educational tool only. Past market performance does not guarantee future results. Always consult a qualified financial advisor, CPA, or attorney before making financial decisions.</div>}
    </div>
  );
}

const BADGE_DEF=[
  {id:"onboarded",icon:"🎯",name:"First Step"},{id:"portfolio_generated",icon:"📊",name:"Portfolio Pioneer"},
  {id:"chapter_completed",icon:"📖",name:"Learning Initiate"},{id:"calculator_used",icon:"🧮",name:"Number Cruncher"},
  {id:"module1_done",icon:"🏗️",name:"Foundation Built"},{id:"module6_done",icon:"🛡️",name:"Tax Shield"},
  {id:"module14_done",icon:"🧠",name:"Behavioral Edge"},{id:"graduate",icon:"🦅",name:"TALON Graduate"},
];

export default function TALON(){
  const [screen,setScreen]=useState("auth");
  const [authUser,setAuthUser]=useState(null);
  const [userData,setUserData]=useState({});
  const [scoreData,setScoreData]=useState(null);
  const [tab,setTab]=useState("dashboard");
  const [badges,setBadges]=useState([]);
  const [completedCh,setCompletedCh]=useState({});
  const [calcUsed,setCalcUsed]=useState(false);
  const [plan,setPlan]=useState("free");
  const [showUpgrade,setShowUpgrade]=useState(false);
  const [time,setTime]=useState(new Date());
  const [streak,setStreak]=useState(1);
  const [loadingUser,setLoadingUser]=useState(true);

  useEffect(()=>{
    const t=setInterval(()=>setTime(new Date()),1000);
    return()=>clearInterval(t);
  },[]);
  useEffect(()=>{
    const l=document.createElement("link");
    l.rel="stylesheet";
    l.href="https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@100;300;400&display=swap";
    document.head.appendChild(l);
  },[]);

  // Check for existing session on load
  useEffect(()=>{
    const {token,userId,email}=getStoredAuth();
    if(token&&userId){
      loadUserData(userId).then(({profile,score,progress})=>{
        if(profile){
          const ud={name:profile.name,age:profile.age,income:profile.income,debt:profile.debt,ef:profile.ef,retireSaving:profile.retire_saving,knowledge:profile.knowledge,email:profile.email};
          setUserData(ud);
          setAuthUser({id:userId,email});
          if(score) setScoreData({total:score.score_total,breakdown:score.breakdown});
          else setScoreData(calcScore(ud));
          if(progress){
            const chMap={};
            (progress.completed_chapters||[]).forEach(id=>{chMap[id]=true;});
            setCompletedCh(chMap);
            setBadges(progress.badges||[]);
            setStreak(progress.streak||1);
          }
          setPlan(profile.plan||"free");
          setScreen("app");
        }else{
          setScreen("onboarding");
        }
        setLoadingUser(false);
      }).catch(()=>{setScreen("auth");setLoadingUser(false);});
    }else{
      setScreen("auth");
      setLoadingUser(false);
    }
  },[]);

  const earnBadge=useCallback((id)=>{
    setBadges(b=>{
      if(b.includes(id)) return b;
      const newBadges=[...b,id];
      const {userId}=getStoredAuth();
      if(userId) saveProgress(userId,{completedCh,badges:newBadges,points:0,streak});
      return newBadges;
    });
  },[completedCh,streak]);

  const completeCh=(id)=>{
    setCompletedCh(p=>{
      const updated={...p,[id]:true};
      const {userId}=getStoredAuth();
      if(userId) saveProgress(userId,{completedCh:updated,badges,points:0,streak});
      return updated;
    });
  };

  const handleAuth=async(user)=>{
    setAuthUser(user);
    const {userId}=getStoredAuth();
    if(userId){
      const {profile,score,progress}=await loadUserData(userId);
      if(profile){
        const ud={name:profile.name,age:profile.age,income:profile.income,debt:profile.debt,ef:profile.ef,retireSaving:profile.retire_saving,knowledge:profile.knowledge,email:profile.email};
        setUserData(ud);
        if(score) setScoreData({total:score.score_total,breakdown:score.breakdown});
        else setScoreData(calcScore(ud));
        if(progress){
          const chMap={};
          (progress.completed_chapters||[]).forEach(id=>{chMap[id]=true;});
          setCompletedCh(chMap);
          setBadges(progress.badges||[]);
          setStreak(progress.streak||1);
        }
        setPlan(profile.plan||"free");
        setScreen("app");
      }else{
        setScreen("onboarding");
      }
    }
  };

  const handleOnboard=async(d)=>{
    const fullData={...d,email:authUser?.email||""};
    setUserData(fullData);
    const sc=calcScore(fullData);
    setScoreData(sc);
    const {userId}=getStoredAuth();
    if(userId){
      await saveUserProfile(userId,fullData);
      await saveScore(userId,sc);
      await saveProgress(userId,{completedCh:{},badges:["onboarded"],points:0,streak:1});
    }
    setBadges(["onboarded"]);
    setScreen("app");
  };

  const handleUpgrade=(p)=>{
    setPlan(p);
    setShowUpgrade(false);
    const {userId}=getStoredAuth();
    if(userId) saveUserProfile(userId,{...userData,plan:p});
  };

  const handleSignOut=()=>{
    clearAuth();
    setScreen("auth");
    setAuthUser(null);
    setUserData({});
    setScoreData(null);
    setBadges([]);
    setCompletedCh({});
    setPlan("free");
  };

  if(loadingUser) return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:28,fontWeight:100,letterSpacing:"0.5em",color:"#fff",fontFamily:"'Josefin Sans',sans-serif",marginBottom:12}}>TALON</div>
        <div style={{fontSize:11,color:C.muted}}>Loading your financial dashboard...</div>
      </div>
    </div>
  );

  if(screen==="auth") return <AuthScreen onAuth={handleAuth}/>;
  if(screen==="onboarding") return <Onboarding onComplete={handleOnboard}/>;

  const TABS=[{id:"dashboard",label:"Home",icon:"⬡"},{id:"portfolio",label:"Grow",icon:"🌱"},{id:"learn",label:"Learn",icon:"📚"},{id:"calculate",label:"Tools",icon:"🧮"},{id:"score",label:"Score",icon:"⭐"}];

  return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'SF Pro Text',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"}}>
      {showUpgrade && <UpgradeModal onClose={()=>setShowUpgrade(false)} onSelect={handleUpgrade}/>}
      <AICoach userData={userData} scoreData={scoreData} plan={plan} onUpgrade={()=>setShowUpgrade(true)} completedCh={completedCh}/>
      <WTFButton/>
      <div style={{background:C.nav,borderBottom:`1px solid ${C.border}`,padding:"11px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:10}}>
        <div>
          <span style={{fontSize:19,fontWeight:300,letterSpacing:"0.42em",color:"#ffffff",fontFamily:"'Josefin Sans',sans-serif",textTransform:"uppercase"}}>TALON</span>
          <span style={{fontSize:7,color:C.dim,display:"block",letterSpacing:"0.1em",marginTop:1}}>POWERED BY LOGANTIA AI</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:7}}>
          <div style={{fontFamily:"monospace",fontSize:9,color:C.dim,textAlign:"right"}}>
            <div>{time.toLocaleTimeString("en-US",{hour12:false})}</div>
            <div>NYSE NASDAQ</div>
          </div>
          {plan==="free" && <button onClick={()=>setShowUpgrade(true)} style={{padding:"4px 9px",background:C.goldDim,border:`1px solid ${C.goldBorder}`,borderRadius:5,color:C.gold,fontSize:9,fontWeight:700,cursor:"pointer"}}>PRO</button>}
          {plan!=="free" && <Pill label={plan.toUpperCase()} color={C.green}/>}
          {scoreData && (
            <div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 9px",background:C.goldDim,border:`1px solid ${C.goldBorder}`,borderRadius:7,cursor:"pointer"}} onClick={()=>setTab("score")}>
              <ScoreRing score={scoreData.total} size={24} stroke={4} hideLabel={true}/>
              <span style={{fontSize:13,fontWeight:700,color:C.gold,fontFamily:"monospace"}}>{scoreData.total}</span>
            </div>
          )}
          <button onClick={handleSignOut} style={{padding:"4px 9px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:5,color:C.dim,fontSize:9,cursor:"pointer"}}>Sign Out</button>
        </div>
      </div>
      <div style={{background:C.nav,borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-around",padding:"0 6px"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"8px 9px",background:"none",border:"none",borderBottom:`2px solid ${tab===t.id?C.gold:"transparent"}`,color:tab===t.id?C.gold:C.muted,cursor:"pointer",fontSize:11,fontWeight:tab===t.id?600:400,transition:"all 0.15s",outline:"none"}}>
            <span style={{fontSize:14}}>{t.icon}</span>
            <span style={{fontSize:8,letterSpacing:"0.07em"}}>{t.label.toUpperCase()}</span>
          </button>
        ))}
      </div>
      <div style={{padding:"18px 18px 60px",maxWidth:860,margin:"0 auto"}}>
        {tab==="dashboard" && <Dashboard userData={userData} scoreData={scoreData} badges={badges} plan={plan} onNav={setTab} onUpgrade={()=>setShowUpgrade(true)} streak={streak}/>}
        {tab==="portfolio" && <Portfolio plan={plan} onEarnBadge={earnBadge} onUpgrade={()=>setShowUpgrade(true)}/>}
        {tab==="learn" && <Learn plan={plan} onEarnBadge={earnBadge} completed={completedCh} onComplete={completeCh} onUpgrade={()=>setShowUpgrade(true)}/>}
        {tab==="calculate" && <Calculators onEarnBadge={earnBadge} hasUsed={calcUsed} setHasUsed={setCalcUsed}/>}
        {tab==="score" && <ScoreDetail scoreData={scoreData} userData={userData} onUpgrade={()=>setShowUpgrade(true)}/>}
      </div>
      <LegalFooter/>
    </div>
  );
}
