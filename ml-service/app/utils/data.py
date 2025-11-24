
import pandas as pd

def to_dataframe(metric_json_list):
    '''Convert list of metric objects to pandas DataFrame'''
    if not metric_json_list:
        return pd.DataFrame()
    return pd.DataFrame(metric_json_list)

def parse_numeric_field(data, key):
    '''Safely get numeric field (for stats)'''
    val = data.get(key)
    try:
        return float(val)
    except (TypeError, ValueError):
        return None

