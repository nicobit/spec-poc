import os
import logging
import re

# Backward-compatible module kept while imports migrate to prompt_manager.py.

# You might define your own prompt classes or integrate with existing company libraries
class CustomPrompt:
    def __init__(self, template: str, variables: list):
        self.template = template
        self.variables = variables

    def format(self, **kwargs):
        prompt_text = self.template
        for var in self.variables:
            value = kwargs.get(var, f'{{{var}}}')
            prompt_text = prompt_text.replace(f'{{{var}}}', str(value))
        return prompt_text

class PromptManager1:
    def __init__(self, templates_path: str = "prompts"):
        self.templates_path = templates_path

    def load_template(self, template_name: str) -> str:
        file_name = f"{template_name}.tpl"  # using a distinct naming pattern
        template_file = os.path.join(self.templates_path, file_name)
        try:
            with open(template_file, "r", encoding="utf-8") as file:
                template = file.read()
            logging.info(f"Loaded template: {template_name}")
            return template
        except FileNotFoundError:
            logging.error(f"Template not found: {template_file}")
            raise
        except Exception as e:
            logging.error(f"Error loading template {template_name}: {e}")
            raise

    def extract_variables(self, template: str) -> list:
        # using a simple regex to find placeholders like {variable}
        pattern = r'\{(\w+)\}'
        return re.findall(pattern, template)

    def create_prompt(self, template_name: str) -> CustomPrompt:
        try:
            template = self.load_template(template_name)
            variables = self.extract_variables(template)
            return CustomPrompt(template, variables)
        except FileNotFoundError:
            logging.error(f"Failed to create prompt: Template '{template_name}' not found.")
            raise
        except Exception as e:
            logging.error(f"Failed to create prompt for template '{template_name}': {e}")
            raise

class PromptManager:
    def __init__(self, templates_path: str = "prompts"):
        self.templates_path = templates_path

    def load_template(self, template_name: str, folder_path: str = None) -> str:
        templates_path = os.path.join(self.templates_path,folder_path) if folder_path else self.templates_path
        file_name = f"{template_name}.tpl"  # using a distinct naming pattern
        template_file = os.path.join(templates_path, file_name)
        try:
            with open(template_file, "r", encoding="utf-8") as file:
                template = file.read()
            logging.info(f"Loaded template: {template_name}")
            return template
        except FileNotFoundError:
            logging.error(f"Template not found: {template_file}")
            raise
        except Exception as e:
            logging.error(f"Error loading template {template_name}: {e}")
            raise
    
    def extract_variables(self, template: str) -> list:
        # using a simple regex to find placeholders like {variable}
        pattern = r'\{(\w+)\}'
        return re.findall(pattern, template)

    def create_prompt(self, template_name: str, folder_path: str = None) -> CustomPrompt:
        try:
            template = self.load_template(template_name, folder_path)
            variables = self.extract_variables(template)
            return CustomPrompt(template, variables)
        except FileNotFoundError:
            logging.error(f"Failed to create prompt: Template '{template_name}' not found.")
            raise
        except Exception as e:
            logging.error(f"Failed to create prompt for template '{template_name}': {e}")
            raise



