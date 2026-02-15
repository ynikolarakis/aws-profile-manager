"""
AWS Profile Manager v7 — Modern Web UI Edition
Python HTTP backend + Browser frontend
Works on any Python 3.10+ — no native dependencies!
"""
import os, sys, re, json, subprocess, configparser, threading, base64, webbrowser
import http.server, urllib.parse, socketserver, socket, queue as qmod
from pathlib import Path
from datetime import datetime, timedelta
from functools import partial
import time as _time

try: import boto3; from botocore.exceptions import ClientError, NoCredentialsError, ProfileNotFound
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "boto3", "--quiet"])
    import boto3; from botocore.exceptions import ClientError, NoCredentialsError, ProfileNotFound

APP_DIR = Path(getattr(sys, '_MEIPASS', Path(__file__).parent))
AWS_DIR = Path.home() / ".aws"
CONFIG_FILE = AWS_DIR / "config"
CREDENTIALS_FILE = AWS_DIR / "credentials"
STATE_FILE = AWS_DIR / "profile-manager.json"

REGIONS = [
    "us-east-1","us-east-2","us-west-1","us-west-2",
    "eu-west-1","eu-west-2","eu-west-3","eu-central-1","eu-central-2",
    "eu-north-1","eu-south-1","eu-south-2",
    "ap-southeast-1","ap-southeast-2","ap-northeast-1","ap-northeast-2",
    "ap-south-1","sa-east-1","ca-central-1","me-south-1","af-south-1",
]
PROFILE_NAME_RE = re.compile(r'^[a-zA-Z0-9][a-zA-Z0-9._-]*$')

SVC = {
    "Amazon Elastic Compute Cloud":{"icon":"⚡","short":"EC2","color":"#f59e0b","cmds":[
        ("Instances",'aws ec2 describe-instances --query "Reservations[].Instances[].{ID:InstanceId,Type:InstanceType,State:State.Name,Name:Tags[?Key==\'Name\']|[0].Value}" --output table'),
        ("Security Groups",'aws ec2 describe-security-groups --query "SecurityGroups[].{ID:GroupId,Name:GroupName,VPC:VpcId}" --output table'),
        ("Volumes",'aws ec2 describe-volumes --query "Volumes[].{ID:VolumeId,Size:Size,State:State}" --output table'),
        ("Key Pairs",'aws ec2 describe-key-pairs --query "KeyPairs[].{Name:KeyName,ID:KeyPairId}" --output table'),
    ]},
    "Amazon Relational Database Service":{"icon":"🗄","short":"RDS","color":"#a78bfa","cmds":[
        ("DB Instances",'aws rds describe-db-instances --query "DBInstances[].{ID:DBInstanceIdentifier,Engine:Engine,Class:DBInstanceClass,Status:DBInstanceStatus}" --output table'),
        ("Snapshots",'aws rds describe-db-snapshots --query "DBSnapshots[].{ID:DBSnapshotIdentifier,Status:Status}" --output table'),
    ]},
    "Amazon Simple Storage Service":{"icon":"📦","short":"S3","color":"#22c55e","cmds":[("List Buckets","aws s3 ls"),("Detailed",'aws s3api list-buckets --query "Buckets[].{Name:Name,Created:CreationDate}" --output table')]},
    "AWS Lambda":{"icon":"λ","short":"Lambda","color":"#22d3ee","cmds":[("Functions",'aws lambda list-functions --query "Functions[].{Name:FunctionName,Runtime:Runtime}" --output table')]},
    "Amazon CloudWatch":{"icon":"📊","short":"CloudWatch","color":"#f472b6","cmds":[("Alarms",'aws cloudwatch describe-alarms --query "MetricAlarms[].{Name:AlarmName,State:StateValue}" --output table'),("Log Groups",'aws logs describe-log-groups --query "logGroups[].{Name:logGroupName}" --output table')]},
    "Amazon Virtual Private Cloud":{"icon":"🌐","short":"VPC","color":"#3b82f6","cmds":[
        ("VPCs",'aws ec2 describe-vpcs --query "Vpcs[].{ID:VpcId,CIDR:CidrBlock,Name:Tags[?Key==\'Name\']|[0].Value}" --output table'),
        ("Subnets",'aws ec2 describe-subnets --query "Subnets[].{ID:SubnetId,CIDR:CidrBlock,AZ:AvailabilityZone}" --output table'),
    ]},
    "Amazon Route 53":{"icon":"🔀","short":"Route53","color":"#f59e0b","cmds":[("Hosted Zones",'aws route53 list-hosted-zones --query "HostedZones[].{Name:Name,Records:ResourceRecordSetCount}" --output table')]},
    "Amazon DynamoDB":{"icon":"⚙️","short":"DynamoDB","color":"#22d3ee","cmds":[("Tables","aws dynamodb list-tables --output table")]},
    "Amazon CloudFront":{"icon":"🌍","short":"CloudFront","color":"#a78bfa","cmds":[("Distributions",'aws cloudfront list-distributions --query "DistributionList.Items[].{ID:Id,Domain:DomainName}" --output table')]},
    "AWS Key Management Service":{"icon":"🔑","short":"KMS","color":"#f59e0b","cmds":[("Keys",'aws kms list-keys --output table'),("Aliases",'aws kms list-aliases --query "Aliases[].{Alias:AliasName}" --output table')]},
    "Amazon Elastic Container Service":{"icon":"🐳","short":"ECS","color":"#3b82f6","cmds":[("Clusters","aws ecs list-clusters --output table")]},
    "AWS CloudTrail":{"icon":"📜","short":"CloudTrail","color":"#22c55e","cmds":[("Trails",'aws cloudtrail describe-trails --query "trailList[].{Name:Name}" --output table')]},
    "Amazon Simple Notification Service":{"icon":"📧","short":"SNS","color":"#f472b6","cmds":[("Topics",'aws sns list-topics --output table')]},
    "Amazon Simple Queue Service":{"icon":"📬","short":"SQS","color":"#22d3ee","cmds":[("Queues","aws sqs list-queues --output table")]},
    "AWS Config":{"icon":"⚙️","short":"Config","color":"#f59e0b","cmds":[("Rules",'aws configservice describe-config-rules --query "ConfigRules[].{Name:ConfigRuleName,State:ConfigRuleState}" --output table')]},
    "Amazon Elastic Load Balancing":{"icon":"⚖️","short":"ELB","color":"#a78bfa","cmds":[("Load Balancers",'aws elbv2 describe-load-balancers --query "LoadBalancers[].{Name:LoadBalancerName,Type:Type}" --output table')]},
    "AWS Security Hub":{"icon":"🛡","short":"SecurityHub","color":"#22c55e","cmds":[("Findings",'aws securityhub get-findings --query "Findings[0:10].{Title:Title,Severity:Severity.Label}" --output table')]},
    "Amazon Bedrock":{"icon":"🤖","short":"Bedrock","color":"#a78bfa","cmds":[("Models",'aws bedrock list-foundation-models --query "modelSummaries[].{ID:modelId,Provider:providerName}" --output table')]},
    "AWS Backup":{"icon":"💾","short":"Backup","color":"#22d3ee","cmds":[("Vaults",'aws backup list-backup-vaults --query "BackupVaultList[].{Name:BackupVaultName}" --output table')]},
    "AWS Elastic Disaster Recovery":{"icon":"🔄","short":"DRS","color":"#f59e0b","cmds":[("Source Servers",'aws drs describe-source-servers --query "items[].{ID:sourceServerID}" --output table')]},
    "Amazon ElastiCache":{"icon":"⚡","short":"ElastiCache","color":"#ef4444","cmds":[("Clusters",'aws elasticache describe-cache-clusters --query "CacheClusters[].{ID:CacheClusterId,Engine:Engine}" --output table')]},
}
COMMON_SVCS = ["Amazon Elastic Compute Cloud","Amazon Simple Storage Service",
    "Amazon Relational Database Service","AWS Lambda","Amazon CloudWatch","Amazon Virtual Private Cloud"]

class StateManager:
    def __init__(self):
        self.data = {"categories":{},"profile_cat":{},"favorites":[],"theme":"dark","collapsed":{}}
        self.load()
    def load(self):
        if STATE_FILE.exists():
            try:
                with open(STATE_FILE) as f: self.data.update(json.load(f))
            except: pass
    def save(self):
        AWS_DIR.mkdir(exist_ok=True)
        with open(STATE_FILE,"w") as f: json.dump(self.data,f,indent=2)
    def get_categories(self): return self.data.get("categories",{})
    def add_category(self,name,color):
        cid=f"cat_{int(_time.time()*1000)}"; self.data.setdefault("categories",{})[cid]={"name":name,"color":color,"order":len(self.data.get("categories",{}))}; self.save(); return cid
    def edit_category(self,cid,name,color):
        cats=self.data.get("categories",{})
        if cid in cats: cats[cid]["name"]=name; cats[cid]["color"]=color; self.save()
    def delete_category(self,cid):
        self.data.get("categories",{}).pop(cid,None)
        pm=self.data.get("profile_cat",{})
        for pn in list(pm):
            if pm[pn]==cid: del pm[pn]
        self.data.get("collapsed",{}).pop(cid,None); self.save()
    def get_profile_cat(self,name): return self.data.get("profile_cat",{}).get(name)
    def set_profile_cat(self,name,cid): self.data.setdefault("profile_cat",{})[name]=cid; self.save()
    def unset_profile_cat(self,name): self.data.get("profile_cat",{}).pop(name,None); self.save()
    def profiles_in_cat(self,cid): return [p for p,c in self.data.get("profile_cat",{}).items() if c==cid]
    def get_favorites(self): return self.data.get("favorites",[])
    def add_favorite(self,label,cmd):
        favs=self.data.setdefault("favorites",[]); 
        if not any(f["cmd"]==cmd for f in favs): favs.append({"label":label,"cmd":cmd}); self.save()
    def remove_favorite(self,cmd): self.data["favorites"]=[f for f in self.data.get("favorites",[]) if f["cmd"]!=cmd]; self.save()
    def is_collapsed(self,cid): return self.data.get("collapsed",{}).get(cid,False)
    def set_collapsed(self,cid,v): self.data.setdefault("collapsed",{})[cid]=v; self.save()
    def get_theme(self): return self.data.get("theme","dark")

class AWSCfg:
    def __init__(self):
        self.profiles={}; self.load()
    def load(self):
        self.profiles={}
        cfg=configparser.ConfigParser(); crd=configparser.ConfigParser()
        if CONFIG_FILE.exists(): cfg.read(str(CONFIG_FILE))
        if CREDENTIALS_FILE.exists(): crd.read(str(CREDENTIALS_FILE))
        for s in cfg.sections():
            n=s.replace("profile ","") if s.startswith("profile ") else s
            p={"name":n,"region":cfg.get(s,"region",fallback="us-east-1"),"output":cfg.get(s,"output",fallback="json"),"type":"credentials"}
            if cfg.has_option(s,"sso_start_url") or cfg.has_option(s,"sso_session"):
                p["type"]="sso"
                for k in ["sso_start_url","sso_region","sso_account_id","sso_role_name","sso_session"]: p[k]=cfg.get(s,k,fallback="")
            elif cfg.has_option(s,"role_arn"):
                p["type"]="role"
                for k in ["role_arn","source_profile","external_id"]: p[k]=cfg.get(s,k,fallback="")
            self.profiles[n]=p
        for s in crd.sections():
            if s not in self.profiles: self.profiles[s]={"name":s,"region":"us-east-1","output":"json","type":"credentials"}
            self.profiles[s]["type"]="credentials"
            for k in ["aws_access_key_id","aws_secret_access_key","aws_session_token"]: self.profiles[s][k]=crd.get(s,k,fallback="")
        if not self.profiles: self.profiles["default"]={"name":"default","type":"credentials","region":"eu-central-1","output":"json"}
    def save(self):
        AWS_DIR.mkdir(exist_ok=True)
        c=configparser.ConfigParser(); cr=configparser.ConfigParser()
        for n,p in self.profiles.items():
            s="default" if n=="default" else f"profile {n}"
            c[s]={"region":p.get("region","us-east-1"),"output":p.get("output","json")}
            if p["type"]=="sso":
                for k in ["sso_start_url","sso_region","sso_account_id","sso_role_name","sso_session"]:
                    if p.get(k): c[s][k]=p[k]
            elif p["type"]=="role":
                for k in ["role_arn","source_profile","external_id"]:
                    if p.get(k): c[s][k]=p[k]
            if p["type"]=="credentials":
                cr[n]={}
                for k in ["aws_access_key_id","aws_secret_access_key","aws_session_token"]:
                    if p.get(k): cr[n][k]=p[k]
        for f in [CONFIG_FILE,CREDENTIALS_FILE]:
            if f.exists():
                try: import shutil; shutil.copy2(f,f.with_suffix(f".bak.{datetime.now().strftime('%Y%m%d_%H%M%S')}"))
                except: pass
        with open(CONFIG_FILE,"w") as f: c.write(f)
        with open(CREDENTIALS_FILE,"w") as f: cr.write(f)
    def active(self):
        n=os.environ.get("AWS_PROFILE","default")
        if n in self.profiles: return n
        if self.profiles: return list(self.profiles.keys())[0]
        return "default"

class EventBus:
    def __init__(self):
        self.clients=[]; self.lock=threading.Lock()
    def add_client(self):
        q=qmod.Queue()
        with self.lock: self.clients.append(q)
        return q
    def remove_client(self,q):
        with self.lock:
            try: self.clients.remove(q)
            except: pass
    def send(self,event,data):
        msg=json.dumps(data)
        with self.lock:
            for q in self.clients:
                try: q.put_nowait(f"event: {event}\ndata: {msg}\n\n")
                except: pass

events = EventBus()

class Api:
    def __init__(self):
        self.mgr=AWSCfg(); self.store=StateManager()
        self._active=self.mgr.active(); self._creds={}; self._init_creds()
    def _init_creds(self):
        prof=self.mgr.profiles.get(self._active,{})
        if prof.get("type")=="credentials":
            for k in ["aws_access_key_id","aws_secret_access_key","aws_session_token"]:
                if prof.get(k): self._creds[k]=prof[k]
    def _make_env(self,profile=None):
        profile=profile or self._active; env=os.environ.copy(); env["AWS_PROFILE"]=profile
        prof=self.mgr.profiles.get(profile,{})
        if prof.get("type")=="credentials" and prof.get("aws_access_key_id"):
            env["AWS_ACCESS_KEY_ID"]=prof["aws_access_key_id"]
            env["AWS_SECRET_ACCESS_KEY"]=prof.get("aws_secret_access_key","")
            if prof.get("aws_session_token"): env["AWS_SESSION_TOKEN"]=prof["aws_session_token"]
            env["AWS_DEFAULT_REGION"]=prof.get("region","us-east-1")
            env.pop("AWS_PROFILE",None)
        elif profile==self._active and self._creds.get("aws_access_key_id"):
            env["AWS_ACCESS_KEY_ID"]=self._creds["aws_access_key_id"]
            env["AWS_SECRET_ACCESS_KEY"]=self._creds.get("aws_secret_access_key","")
            if self._creds.get("aws_session_token"): env["AWS_SESSION_TOKEN"]=self._creds["aws_session_token"]
            env["AWS_DEFAULT_REGION"]=prof.get("region","us-east-1")
            env.pop("AWS_PROFILE",None)
        return env
    def get_state(self):
        profiles={}
        for n,p in self.mgr.profiles.items():
            d={**p}
            if d.get('aws_secret_access_key'): d['has_keys']=True; d['aws_secret_access_key']='••••••••'
            profiles[n]=d
        return {'profiles':profiles,'categories':self.store.get_categories(),'profile_cat':self.store.data.get('profile_cat',{}),'favorites':self.store.get_favorites(),'theme':self.store.get_theme(),'active':self._active,'collapsed':self.store.data.get('collapsed',{}),'regions':REGIONS,'services_map':{k:{"icon":v["icon"],"short":v["short"],"color":v["color"],"cmds":v["cmds"]} for k,v in SVC.items()}}
    def get_logo(self):
        for p in [APP_DIR/"logo.png",Path(__file__).parent/"logo.png"]:
            if p.exists():
                try: return base64.b64encode(p.read_bytes()).decode()
                except: pass
        return None
    def validate_name(self,name):
        if not name: return "Name is required"
        if not PROFILE_NAME_RE.match(name): return "Only letters, numbers, dots, hyphens, underscores. No spaces."
        return None
    def save_profile(self,data):
        orig=data.pop("_orig_name",""); name=data.get("name","").strip()
        err=self.validate_name(name)
        if err: return {"error":err}
        real=orig or name
        if real in self.mgr.profiles:
            old=self.mgr.profiles[real]
            if data.get("type")=="credentials" and not data.get("aws_secret_access_key") and old.get("aws_secret_access_key"):
                data["aws_secret_access_key"]=old["aws_secret_access_key"]
        if orig and orig!=name: self.mgr.profiles.pop(orig,None); self.store.unset_profile_cat(orig)
        self.mgr.profiles[name]=data
        cat_id=data.pop("_cat_id",None)
        if cat_id=="__none__": self.store.unset_profile_cat(name)
        elif cat_id: self.store.set_profile_cat(name,cat_id)
        # Auto-save to AWS CLI config/credentials files
        try: self.mgr.save()
        except Exception as e: return {"error":f"Saved in memory but failed to write AWS files: {e}"}
        return {"ok":True}
    def delete_profile(self,name): self.mgr.profiles.pop(name,None); self.store.unset_profile_cat(name); self.mgr.save(); return {"ok":True}
    def activate(self,name):
        self._active=name; os.environ["AWS_PROFILE"]=name; self._creds={}
        prof=self.mgr.profiles.get(name,{})
        if prof.get("type")=="credentials":
            for k in ["aws_access_key_id","aws_secret_access_key","aws_session_token"]:
                v=prof.get(k,"")
                if v and not v.startswith("••"): self._creds[k]=v
        self._bg_identity(name); return {"ok":True}
    def run_command(self,cmd):
        profile=self._active
        def _run():
            try:
                env=self._make_env(profile); run_cmd=cmd
                if cmd.strip().startswith("aws ") and "--profile" not in cmd and not self._creds:
                    parts=cmd.split();
                    if len(parts)>=2: parts.insert(2,f"--profile {profile}"); run_cmd=" ".join(parts)
                kw={"shell":True,"stdout":subprocess.PIPE,"stderr":subprocess.STDOUT,"env":env}
                if sys.platform=="win32": kw["creationflags"]=0x08000000
                proc=subprocess.Popen(run_cmd,**kw)
                for line in iter(proc.stdout.readline,b""):
                    events.send("term",{"type":"output","text":line.decode("utf-8",errors="replace")})
                proc.wait()
                events.send("term",{"type":"done","code":proc.returncode})
            except FileNotFoundError:
                events.send("term",{"type":"output","text":"ERROR: aws CLI not found in PATH\n"})
                events.send("term",{"type":"done","code":1})
            except Exception as e:
                events.send("term",{"type":"output","text":f"ERROR: {str(e)[:80]}\n"})
                events.send("term",{"type":"done","code":1})
        threading.Thread(target=_run,daemon=True).start(); return {"ok":True}
    def bulk_run(self,profiles,cmd):
        def _run():
            for p in profiles:
                events.send("term",{"type":"output","text":f"\n{'='*50}\n  Profile: {p}\n{'='*50}\n"})
                try:
                    env=self._make_env(p); run_cmd=cmd; prof=self.mgr.profiles.get(p,{})
                    if cmd.strip().startswith("aws ") and "--profile" not in cmd and not prof.get("aws_access_key_id"):
                        parts=cmd.split()
                        if len(parts)>=2: parts.insert(2,f"--profile {p}"); run_cmd=" ".join(parts)
                    kw={"shell":True,"stdout":subprocess.PIPE,"stderr":subprocess.STDOUT,"env":env}
                    if sys.platform=="win32": kw["creationflags"]=0x08000000
                    proc=subprocess.Popen(run_cmd,**kw); out,_=proc.communicate(timeout=30)
                    events.send("term",{"type":"output","text":out.decode("utf-8",errors="replace")})
                    if proc.returncode==0: events.send("term",{"type":"output","text":"  ✓ done\n"})
                    else: events.send("term",{"type":"output","text":f"  ✗ exit {proc.returncode}\n"})
                except Exception as e: events.send("term",{"type":"output","text":f"  ✗ {str(e)[:60]}\n"})
            events.send("term",{"type":"done","code":0})
        threading.Thread(target=_run,daemon=True).start(); return {"ok":True}
    def add_category(self,name,color): return {"ok":True,"id":self.store.add_category(name,color)}
    def edit_category(self,cid,name,color): self.store.edit_category(cid,name,color); return {"ok":True}
    def delete_category(self,cid): self.store.delete_category(cid); return {"ok":True}
    def set_profile_category(self,profile,cat_id):
        if cat_id=="__none__": self.store.unset_profile_cat(profile)
        else: self.store.set_profile_cat(profile,cat_id)
        return {"ok":True}
    def toggle_collapsed(self,cid):
        cur=self.store.is_collapsed(cid); self.store.set_collapsed(cid,not cur); return {"ok":True,"collapsed":not cur}
    def add_favorite(self,label,cmd): self.store.add_favorite(label,cmd); return {"ok":True}
    def remove_favorite(self,cmd): self.store.remove_favorite(cmd); return {"ok":True}
    def save_config(self):
        try: self.mgr.save(); return {"ok":True}
        except Exception as e: return {"error":str(e)}
    def reload_config(self):
        self.mgr.load(); self.store.load(); self._active=self.mgr.active(); self._creds={}; self._init_creds()
        return self.get_state()
    def set_theme(self,theme): self.store.data["theme"]=theme; self.store.save(); return {"ok":True}
    def discover_services(self,profile=None):
        profile=profile or self._active
        def _go():
            found=[]; src="offline"
            try:
                s=boto3.Session(profile_name=profile); ce=s.client("ce",region_name="us-east-1")
                end=datetime.now().date(); start=end-timedelta(days=30)
                r=ce.get_cost_and_usage(TimePeriod={"Start":start.strftime("%Y-%m-%d"),"End":end.strftime("%Y-%m-%d")},Granularity="MONTHLY",Metrics=["UnblendedCost"],GroupBy=[{"Type":"DIMENSION","Key":"SERVICE"}])
                for g in r.get("ResultsByTime",[{}])[0].get("Groups",[]):
                    sn,cost=g["Keys"][0],float(g["Metrics"]["UnblendedCost"]["Amount"])
                    if cost>0.001 and sn in SVC: found.append({"name":sn,"cost":round(cost,2)})
                found.sort(key=lambda x:x["cost"],reverse=True)
                if found: src="cost"
            except: pass
            if not found:
                try:
                    s=boto3.Session(profile_name=profile); s.client("sts").get_caller_identity()
                    for sn in COMMON_SVCS:
                        if sn in SVC: found.append({"name":sn,"cost":None})
                    src="sts"
                except: pass
            if not found:
                for sn in list(SVC.keys())[:8]: found.append({"name":sn,"cost":None})
            events.send("services",{"svcs":found,"src":src,"profile":profile})
        threading.Thread(target=_go,daemon=True).start(); return {"ok":True}
    def _bg_identity(self,profile):
        def _go():
            try:
                s=boto3.Session(profile_name=profile); i=s.client("sts").get_caller_identity()
                events.send("identity",{"account":i.get("Account",""),"arn":i.get("Arn",""),"error":None})
            except Exception as e: events.send("identity",{"account":"","arn":"","error":str(e)[:80]})
        threading.Thread(target=_go,daemon=True).start()
    def get_cost(self,profile,year,month):
        def _go():
            try:
                s=boto3.Session(profile_name=profile); ce=s.client("ce",region_name="us-east-1")
                start=f"{year:04d}-{month:02d}-01"
                end=f"{year+1:04d}-01-01" if month==12 else f"{year:04d}-{month+1:02d}-01"
                r=ce.get_cost_and_usage(TimePeriod={"Start":start,"End":end},Granularity="MONTHLY",Metrics=["UnblendedCost"],GroupBy=[{"Type":"DIMENSION","Key":"SERVICE"}])
                svcs=[]; total=0
                for g in r.get("ResultsByTime",[{}])[0].get("Groups",[]):
                    sn=g["Keys"][0]; cost=float(g["Metrics"]["UnblendedCost"]["Amount"])
                    if cost>0.001: svcs.append({"name":sn,"cost":round(cost,2)}); total+=cost
                svcs.sort(key=lambda x:x["cost"],reverse=True)
                events.send("cost_data",{"services":svcs,"total":round(total,2),"error":None})
            except Exception as e: events.send("cost_data",{"services":[],"total":0,"error":str(e)[:60]})
        threading.Thread(target=_go,daemon=True).start(); return {"ok":True}
    def fetch_cost_badges(self):
        for n in self.mgr.profiles: self._bg_badge(n)
        return {"ok":True}
    def _bg_badge(self,profile):
        def _go():
            try:
                s=boto3.Session(profile_name=profile); ce=s.client("ce",region_name="us-east-1")
                end=datetime.now().date(); start=end-timedelta(days=30)
                r=ce.get_cost_and_usage(TimePeriod={"Start":start.strftime("%Y-%m-%d"),"End":end.strftime("%Y-%m-%d")},Granularity="MONTHLY",Metrics=["UnblendedCost"])
                total=sum(float(rt.get("Total",{}).get("UnblendedCost",{}).get("Amount",0)) for rt in r.get("ResultsByTime",[]))
                events.send("cost_badge",{"profile":profile,"cost":f"${total:.2f}"})
            except: pass
        threading.Thread(target=_go,daemon=True).start()
    def check_sso_status(self):
        cache_dir=Path.home()/".aws"/"sso"/"cache"; results={}
        if cache_dir.exists():
            now=datetime.now()
            for f in cache_dir.glob("*.json"):
                try:
                    data=json.loads(f.read_text())
                    if "expiresAt" in data:
                        exp=datetime.fromisoformat(data["expiresAt"].replace("Z","").split("+")[0])
                        if exp>now:
                            for n,p in self.mgr.profiles.items():
                                if p.get("type")=="sso": results[n]="active"
                except: continue
        for n,p in self.mgr.profiles.items():
            if p.get("type")=="sso" and n not in results: results[n]="expired"
        return results
    def export_json(self):
        return {"profiles":{n:{k:v for k,v in p.items()} for n,p in self.mgr.profiles.items()},"categories":self.store.get_categories(),"profile_cat":self.store.data.get("profile_cat",{})}
    def import_json(self,data):
        profiles=data.get("profiles",{})
        for n,p in profiles.items(): p["name"]=n; self.mgr.profiles[n]=p
        for cid,cdata in data.get("categories",{}).items():
            if cid not in self.store.data.setdefault("categories",{}): self.store.data["categories"][cid]=cdata
        for pn,cid in data.get("profile_cat",{}).items(): self.store.data.setdefault("profile_cat",{})[pn]=cid
        self.store.save(); return {"ok":True,"count":len(profiles)}

api_instance = Api()

class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self,*a): pass
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin","*")
        self.send_header("Access-Control-Allow-Methods","GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers","Content-Type")
    def _json(self,data,code=200):
        body=json.dumps(data).encode()
        self.send_response(code); self._cors()
        self.send_header("Content-Type","application/json"); self.send_header("Content-Length",str(len(body)))
        self.end_headers(); self.wfile.write(body)
    def _body(self):
        length=int(self.headers.get('Content-Length',0))
        return json.loads(self.rfile.read(length)) if length else {}
    def do_OPTIONS(self): self.send_response(200); self._cors(); self.end_headers()
    def do_GET(self):
        path=urllib.parse.urlparse(self.path).path
        if path=="/" or path=="/ui.html": self._serve_file("ui.html","text/html")
        elif path=="/api/state": self._json(api_instance.get_state())
        elif path=="/api/logo": self._json({"data":api_instance.get_logo()})
        elif path=="/api/sso_status": self._json(api_instance.check_sso_status())
        elif path=="/api/export": self._json(api_instance.export_json())
        elif path=="/api/events": self._sse()
        else: self.send_error(404)
    def do_POST(self):
        path=urllib.parse.urlparse(self.path).path; body=self._body()
        routes={
            "/api/activate": lambda: api_instance.activate(body.get("name","")),
            "/api/run": lambda: api_instance.run_command(body.get("cmd","")),
            "/api/bulk_run": lambda: api_instance.bulk_run(body.get("profiles",[]),body.get("cmd","")),
            "/api/save_profile": lambda: api_instance.save_profile(body),
            "/api/delete_profile": lambda: api_instance.delete_profile(body.get("name","")),
            "/api/validate_name": lambda: {"result":api_instance.validate_name(body.get("name",""))},
            "/api/set_profile_category": lambda: api_instance.set_profile_category(body.get("profile",""),body.get("cat_id","")),
            "/api/toggle_collapsed": lambda: api_instance.toggle_collapsed(body.get("cid","")),
            "/api/add_category": lambda: api_instance.add_category(body.get("name",""),body.get("color","")),
            "/api/edit_category": lambda: api_instance.edit_category(body.get("cid",""),body.get("name",""),body.get("color","")),
            "/api/delete_category": lambda: api_instance.delete_category(body.get("cid","")),
            "/api/add_favorite": lambda: api_instance.add_favorite(body.get("label",""),body.get("cmd","")),
            "/api/remove_favorite": lambda: api_instance.remove_favorite(body.get("cmd","")),
            "/api/save_config": lambda: api_instance.save_config(),
            "/api/reload": lambda: api_instance.reload_config(),
            "/api/set_theme": lambda: api_instance.set_theme(body.get("theme","")),
            "/api/discover_services": lambda: api_instance.discover_services(body.get("profile")),
            "/api/get_cost": lambda: api_instance.get_cost(body.get("profile",""),body.get("year",2025),body.get("month",1)),
            "/api/fetch_cost_badges": lambda: api_instance.fetch_cost_badges(),
            "/api/import": lambda: api_instance.import_json(body),
        }
        handler=routes.get(path)
        if handler:
            try: self._json(handler())
            except Exception as e: self._json({"error":str(e)},500)
        else: self.send_error(404)
    def _serve_file(self,name,mime):
        for d in [APP_DIR,Path(__file__).parent]:
            p=d/name
            if p.exists():
                data=p.read_bytes()
                self.send_response(200); self._cors()
                self.send_header("Content-Type",f"{mime}; charset=utf-8")
                self.send_header("Content-Length",str(len(data))); self.end_headers()
                self.wfile.write(data); return
        self.send_error(404)
    def _sse(self):
        self.send_response(200); self._cors()
        self.send_header("Content-Type","text/event-stream")
        self.send_header("Cache-Control","no-cache")
        self.send_header("Connection","keep-alive"); self.end_headers()
        q=events.add_client()
        try:
            while True:
                try:
                    msg=q.get(timeout=15)
                    self.wfile.write(msg.encode()); self.wfile.flush()
                except qmod.Empty:
                    self.wfile.write(b": keepalive\n\n"); self.wfile.flush()
        except: pass
        finally: events.remove_client(q)

class ThreadedServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads=True; allow_reuse_address=True

def find_port():
    with socket.socket(socket.AF_INET,socket.SOCK_STREAM) as s:
        s.bind(('127.0.0.1',0)); return s.getsockname()[1]

if __name__=="__main__":
    port=find_port(); url=f"http://127.0.0.1:{port}"
    server=ThreadedServer(('127.0.0.1',port),Handler)
    print(f"\n  ☁  AWS Profile Manager v7\n  🌐 {url}\n  Press Ctrl+C to stop\n")
    def startup():
        _time.sleep(1); api_instance._bg_identity(api_instance._active)
        api_instance.discover_services(); api_instance.fetch_cost_badges()
        sso=api_instance.check_sso_status()
        if sso: events.send("sso_status",sso)
    threading.Thread(target=startup,daemon=True).start()
    threading.Timer(0.5,lambda: webbrowser.open(url)).start()
    try: server.serve_forever()
    except KeyboardInterrupt: print("\n  Shutting down..."); server.shutdown()
