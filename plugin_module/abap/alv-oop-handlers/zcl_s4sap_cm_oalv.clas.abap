class ZCL_S4SAP_CM_OALV definition
  public
  inheriting from CL_GUI_ALV_GRID
  create public .

public section.

  data MV_DYNNR type SY-DYNNR .
  data MV_REPID type SY-CPROG .

  methods SET_FIXED_COLUMN .
  methods SET_OPTIMIZER .
  methods SET_OPTIMIZER_COL_ID
    importing
      !COL type LVC_S_COL .
  methods SET_ROW_RESIZE .
  methods SET_CURSOR
    importing
      !ROW type I
      !COL type I .
  methods SET_ERROR_CELL
    importing
      !CELL_TABLE type LVC_T_ERR .
protected section.
private section.
ENDCLASS.



CLASS ZCL_S4SAP_CM_OALV IMPLEMENTATION.


  method SET_CURSOR.

    CALL METHOD ME->SET_CURRENT_CELL_BASE
      EXPORTING
        ROW = ROW
        COL = COL.

  endmethod.


  METHOD SET_ERROR_CELL.

    me->set_error_cells( cell_table	).

  ENDMETHOD.


  method SET_FIXED_COLUMN.

    CALL METHOD ME->SET_FIXED_COLS
      EXPORTING
        COLS = 5.

  endmethod.


  method SET_OPTIMIZER.

    CALL METHOD ME->OPTIMIZE_ALL_COLS
      EXPORTING
        INCLUDE_HEADER = 1.

  endmethod.


  method SET_OPTIMIZER_COL_ID.

    CALL METHOD ME->OPTIMIZE_COL_ID
      EXPORTING
        INCLUDE_HEADER = 1
        COL_ID         = COL.

  endmethod.


  method SET_ROW_RESIZE.

    CALL METHOD ME->SET_RESIZE_ROWS
      EXPORTING
        ENABLE = 1.

  endmethod.
ENDCLASS.
