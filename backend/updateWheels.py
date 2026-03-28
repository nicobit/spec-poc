import os

import subprocess

import re



# Configuration

source_requirements = "requirements_source.txt"

target_requirements = "requirements.txt"

wheels_dir = "./.wheels"



# Step 1: Generate wheels from the source requirements file

os.makedirs(wheels_dir, exist_ok=True)

print("Building wheels from requirements_source.txt...")

subprocess.run(["pip", "wheel", "-r", source_requirements, "--wheel-dir", wheels_dir], check=True)



# Step 2: Map package names to wheel filenames

wheel_files = os.listdir(wheels_dir)

pkg_pattern = re.compile(r"^([^-]+)-.*\.whl$")



wheel_mapping = {}

for wheel in wheel_files:

    match = pkg_pattern.match(wheel)

    if match:

        pkg_name = match.group(1).replace("_", "-").lower()

        wheel_mapping[pkg_name] = wheel



# Step 3: Rewrite requirements.txt with wheel references

new_requirements = []

with open(source_requirements, "r") as src_req:

    for line in src_req:

        line = line.strip()

        if line and not line.startswith("#"):

            pkg = re.split(r"[=<>!~]", line)[0].strip().lower()

            wheel_file = wheel_mapping.get(pkg)

            if wheel_file and "win_" not in wheel_file:

                new_requirements.append(f"./wheels/{wheel_file}")

                print(f"Added wheel for package: {pkg}")

            else:

                print(f"⚠️ Wheel not found for package: {pkg}. Keeping original line.")

                new_requirements.append(line)



with open(target_requirements, "w") as tgt_req:

    tgt_req.write("\n".join(new_requirements))



print(f"✅ {target_requirements} created successfully referencing wheel files.")