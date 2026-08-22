interface ZIF_S4SAP_CM
  public .


  types:
    BEGIN OF ty_alv_column,
      name   TYPE string,
      text   TYPE string,
      length TYPE lvc_outlen,
    END OF ty_alv_column .
  types:
    tt_alv_column TYPE TABLE OF ty_alv_column WITH EMPTY KEY .

  class-data MO_TABLE type ref to DATA .
  class-data MO_SALV type ref to CL_SALV_TABLE .
  class-data MV_CANCEL type ABAP_BOOL .
  class-data MT_FCAT type LVC_T_FCAT .

  class-methods CREATE_DYNAMIC_TABLE
    importing
      !IV_TABNAME type FIELDNAME optional
      !IT_FIELDCAT type LVC_T_FCAT optional
      !IT_REFITAB type STANDARD TABLE optional
    returning
      value(RO_TABLE) type ref to DATA .
  methods SALV_ON_LINK_CLICK
    for event LINK_CLICK of CL_SALV_EVENTS_TABLE
    importing
      !ROW
      !COLUMN
      !SENDER .
  methods SALV_ON_FUNCTION_CLICK
    for event ADDED_FUNCTION of CL_SALV_EVENTS_TABLE
    importing
      !E_SALV_FUNCTION
      !SENDER .
  methods SALV_ON_DOUBLE_CLICK
    for event DOUBLE_CLICK of CL_SALV_EVENTS_TABLE
    importing
      !ROW
      !COLUMN
      !SENDER .
  methods SALV_GET_SELECTED_ROWS
    exporting
      !ET_LIST type INDEX TABLE .
  methods SALV_TOP_OF_PAGE
    for event TOP_OF_PAGE of CL_SALV_EVENTS_TABLE
    importing
      !R_TOP_OF_PAGE
      !PAGE
      !TABLE_INDEX
      !SENDER .
  methods SALV_END_OF_PAGE
    for event END_OF_PAGE of CL_SALV_EVENTS_TABLE
    importing
      !R_END_OF_PAGE
      !PAGE
      !SENDER .
  methods SALV_BEFORE_SALV_FUNCTION
    for event BEFORE_SALV_FUNCTION of CL_SALV_EVENTS_TABLE
    importing
      !E_SALV_FUNCTION
      !SENDER .
  methods SALV_AFTER_SALV_FUNCTION
    for event AFTER_SALV_FUNCTION of CL_SALV_EVENTS_TABLE
    importing
      !E_SALV_FUNCTION
      !SENDER .
endinterface.
