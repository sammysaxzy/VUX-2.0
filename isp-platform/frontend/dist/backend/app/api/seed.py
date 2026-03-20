from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from passlib.context import CryptContext
from ..core.database import get_db
from ..models.models import User, Client, MSTBox, FibreRoute, FibreCore, ActivityLog
from datetime import datetime
import random

router = APIRouter(prefix="/seed", tags=["Seed Data"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@router.post("/demo")
async def seed_demo_data(db: AsyncSession = Depends(get_db)):
    """Seed database with demo data for testing"""
    
    # Check if data already exists
    existing = await db.execute(select(User).limit(1))
    if existing.scalar_one_or_none():
        return {"message": "Database already contains data. Skipping seed."}
    
    # Create demo users
    users = [
        User(
            email="admin@isp.com",
            username="admin",
            hashed_password=pwd_context.hash("admin123"),
            full_name="System Admin",
            role="super_admin",
            is_active=True
        ),
        User(
            email="engineer@isp.com",
            username="engineer",
            hashed_password=pwd_context.hash("engineer123"),
            full_name="John Engineer",
            role="field_engineer",
            is_active=True
        ),
        User(
            email="noc@isp.com",
            username="noc",
            hashed_password=pwd_context.hash("noc123"),
            full_name="NOC Operator",
            role="noc_viewer",
            is_active=True
        )
    ]
    
    for user in users:
        db.add(user)
    await db.commit()
    
    # Create MST boxes
    mst_boxes = [
        MSTBox(
            mst_id="MST-001",
            name="Central Office MST",
            location="123 Main Street, Downtown",
            latitude=40.7128,
            longitude=-74.0060,
            total_cores=144,
            used_cores=98,
            status="active",
            splitter_type="1:32",
            installation_date=datetime(2022, 1, 15)
        ),
        MSTBox(
            mst_id="MST-002",
            name="North District MST",
            location="456 North Avenue",
            latitude=40.7580,
            longitude=-73.9855,
            total_cores=96,
            used_cores=72,
            status="active",
            splitter_type="1:16",
            installation_date=datetime(2022, 3, 20)
        ),
        MSTBox(
            mst_id="MST-003",
            name="East Side MST",
            location="789 East Boulevard",
            latitude=40.7282,
            longitude=-73.7949,
            total_cores=48,
            used_cores=24,
            status="active",
            splitter_type="1:8",
            installation_date=datetime(2022, 6, 10)
        ),
        MSTBox(
            mst_id="MST-004",
            name="Industrial Zone MST",
            location="100 Industry Park",
            latitude=40.6892,
            longitude=-74.0445,
            total_cores=192,
            used_cores=150,
            status="active",
            splitter_type="1:64",
            installation_date=datetime(2021, 11, 5)
        ),
        MSTBox(
            mst_id="MST-005",
            name="Residential Area MST",
            location="200 Oak Street",
            latitude=40.7484,
            longitude=-73.9857,
            total_cores=72,
            used_cores=8,
            status="maintenance",
            splitter_type="1:32",
            installation_date=datetime(2023, 2, 28)
        )
    ]
    
    for mst in mst_boxes:
        db.add(mst)
    await db.commit()
    
    # Create clients
    clients = [
        Client(
            client_id="CLI-001",
            name="TechCorp Solutions",
            contact_person="Alice Johnson",
            email="alice@techcorp.com",
            phone="+1-555-0101",
            address="500 Tech Park, Suite 100",
            latitude=40.7130,
            longitude=-74.0070,
            mst_box_id=1,
            service_type="business_fibre",
            status="active",
            pppoe_username="techcorp_pppoe",
            vlan_id=100,
            olt_name="OLT-CENTRAL-01",
            pon_port="PON 1/2/3",
            optical_power=-18.5,
            package_speed="500/500 Mbps"
        ),
        Client(
            client_id="CLI-002",
            name="Global Industries",
            contact_person="Bob Smith",
            email="bob@globalind.com",
            phone="+1-555-0102",
            address="750 Industrial Ave",
            latitude=40.6895,
            longitude=-74.0450,
            mst_box_id=4,
            service_type="business_fibre",
            status="active",
            pppoe_username="global_pppoe",
            vlan_id=101,
            olt_name="OLT-INDUSTRIAL-01",
            pon_port="PON 2/1/1",
            optical_power=-16.2,
            package_speed="1Gbps Dedicated"
        ),
        Client(
            client_id="CLI-003",
            name="City Hospital",
            contact_person="Dr. Mary Wilson",
            email="mwilson@cityhospital.org",
            phone="+1-555-0103",
            address="300 Health Way",
            latitude=40.7585,
            longitude=-73.9860,
            mst_box_id=2,
            service_type="business_fibre",
            status="active",
            pppoe_username="hospital_pppoe",
            vlan_id=102,
            olt_name="OLT-NORTH-01",
            pon_port="PON 1/1/4",
            optical_power=-15.8,
            package_speed="1Gbps Dedicated"
        ),
        Client(
            client_id="CLI-004",
            name="Home User - Johnson Family",
            contact_person="Mike Johnson",
            email="mike.j@email.com",
            phone="+1-555-0104",
            address="25 Oak Lane",
            latitude=40.7488,
            longitude=-73.9860,
            mst_box_id=5,
            service_type="residential_fibre",
            status="pending",
            pppoe_username="johnson_home",
            vlan_id=200,
            olt_name="OLT-RES-01",
            pon_port="PON 1/3/2",
            optical_power=-21.3,
            package_speed="100/50 Mbps"
        ),
        Client(
            client_id="CLI-005",
            name="Downtown Cafe",
            contact_person="Sarah Chen",
            email="sarah@downtowncafe.com",
            phone="+1-555-0105",
            address="150 Main Street",
            latitude=40.7132,
            longitude=-74.0065,
            mst_box_id=1,
            service_type="business_fibre",
            status="active",
            pppoe_username="cafe_pppoe",
            vlan_id=103,
            olt_name="OLT-CENTRAL-01",
            pon_port="PON 1/2/4",
            optical_power=-19.1,
            package_speed="200/200 Mbps"
        )
    ]
    
    for client in clients:
        db.add(client)
    await db.commit()
    
    # Create fibre routes
    routes = [
        FibreRoute(
            name="Central Backbone",
            route_type="backbone",
            total_cores=288,
            status="active",
            start_location="Central Office",
            end_location="North District",
            length_km=5.2
        ),
        FibreRoute(
            name="East Distribution",
            route_type="distribution",
            total_cores=96,
            status="active",
            start_location="Central Office",
            end_location="East Side",
            length_km=3.8
        ),
        FibreRoute(
            name="Industrial Feeder",
            route_type="feeder",
            total_cores=144,
            status="active",
            start_location="Central Office",
            end_location="Industrial Zone",
            length_km=4.1
        )
    ]
    
    for route in routes:
        db.add(route)
    await db.commit()
    
    # Create fibre cores
    color_names = ["Blue", "Orange", "Green", "Violet", "White", "Yellow", 
                   "Aqua", "Magenta", "Lime", "Gold", "Sky Blue", "Pink"]
    
    for route_id in [1, 2, 3]:
        for i in range(1, 13):  # 12 cores per route
            core = FibreCore(
                route_id=route_id,
                core_number=i,
                color_name=color_names[i-1],
                status="active" if random.random() > 0.2 else "reserved",
                signal_loss_db=random.uniform(0.1, 0.5)
            )
            db.add(core)
    await db.commit()
    
    # Create activity logs
    activities = [
        ActivityLog(
            user_id=1,
            activity_type="client_created",
            description="New client TechCorp Solutions added to system",
            entity_type="client",
            entity_id=1
        ),
        ActivityLog(
            user_id=2,
            activity_type="mst_maintenance",
            description="MST-005 scheduled for maintenance",
            entity_type="mst_box",
            entity_id=5
        ),
        ActivityLog(
            user_id=1,
            activity_type="fibre_spliced",
            description="Core 3 spliced at MST-002",
            entity_type="fibre_core",
            entity_id=15
        ),
        ActivityLog(
            user_id=2,
            activity_type="client_activated",
            description="Client City Hospital service activated",
            entity_type="client",
            entity_id=3
        ),
        ActivityLog(
            user_id=3,
            activity_type="alert_created",
            description="High optical power warning for MST-004",
            entity_type="mst_box",
            entity_id=4
        )
    ]
    
    for activity in activities:
        db.add(activity)
    await db.commit()
    
    return {
        "message": "Demo data seeded successfully",
        "users": len(users),
        "mst_boxes": len(mst_boxes),
        "clients": len(clients),
        "fibre_routes": len(routes),
        "fibre_cores": 36,
        "activities": len(activities)
    }