

class Utils:
    
    
    @staticmethod
    def get_example_str(examples):
        retval =  "\n".join(f"{example['question']}: {example['sql']}" for example in examples if isinstance(example, dict) and 'question' in example and 'sql' in example)
        return retval